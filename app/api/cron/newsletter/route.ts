import { NextRequest, NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/newsletter";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>"; anything else is refused, so nobody
// can trigger emails by visiting this URL.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDailyDigest({ budgetMs: 50_000 });
    console.log("[newsletter] cron run:", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err) {
    console.error("[newsletter] cron run failed:", err);
    return NextResponse.json({ error: "Digest run failed" }, { status: 500 });
  }
}
