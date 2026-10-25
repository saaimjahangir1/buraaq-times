import { NextRequest, NextResponse } from "next/server";
import { getPostsForIndexing } from "@/lib/public-data";
import { postHref } from "@/lib/types";
import { SITE_URL } from "@/lib/seo";
import { submitToIndexNow } from "@/lib/indexnow";

// Called every 15 minutes by the VPS scheduler (scripts/cron-proofread-reminders.sh).
// Sends stories published or edited in the last 30 minutes (including scheduled
// ones that just went live) to IndexNow, so Bing and ChatGPT search see them fast.
//   ?all=1 sends every published story once (use after first setup).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!/^https:\/\//.test(SITE_URL) || /localhost|vercel\.app|\d+\.\d+\.\d+\.\d+/.test(SITE_URL)) {
    return NextResponse.json({ skipped: `NEXT_PUBLIC_SITE_URL (${SITE_URL}) isn't the public domain` });
  }
  const all = req.nextUrl.searchParams.get("all") === "1";
  const posts = await getPostsForIndexing(all ? {} : { since: new Date(Date.now() - 30 * 60_000) });
  const urls = posts.map((p) => `${SITE_URL}${postHref(p)}`);
  if (urls.length === 0) return NextResponse.json({ submitted: 0 });
  if (all) urls.unshift(`${SITE_URL}/`, `${SITE_URL}/news`, `${SITE_URL}/articles`);
  else urls.push(`${SITE_URL}/`);
  try {
    const result = await submitToIndexNow(urls);
    if (!result.submitted) console.error("[indexnow] not accepted:", result.status);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[indexnow] failed:", err);
    return NextResponse.json({ error: "IndexNow request failed" }, { status: 502 });
  }
}
