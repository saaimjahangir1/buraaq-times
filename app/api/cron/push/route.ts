import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { notifyNewPosts } from "@/lib/push-notify";

// Every 15 minutes (VPS scheduler): announces stories that went live and
// haven't been announced yet — mainly scheduled stories reaching their time.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await notifyNewPosts({ budgetMs: 50_000 }));
  } catch (err) {
    console.error("[push] cron run failed:", err);
    return NextResponse.json({ error: "Push run failed" }, { status: 500 });
  }
}
