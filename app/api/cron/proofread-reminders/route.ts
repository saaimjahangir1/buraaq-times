import { NextRequest, NextResponse } from "next/server";
import { sendProofreadReminders } from "@/lib/proofread";

// Called every 15 minutes by the VPS scheduler (scripts/cron-proofread-reminders.sh).
// It only emails when something has waited unclaimed for the reminder interval
// (4 hours by default), so frequent calls are cheap and don't spam anyone.
// Needs "Authorization: Bearer <CRON_SECRET>", like the newsletter cron.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendProofreadReminders();
    if (result.sent > 0) console.log("[proofread] reminders:", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err) {
    console.error("[proofread] reminder run failed:", err);
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}
