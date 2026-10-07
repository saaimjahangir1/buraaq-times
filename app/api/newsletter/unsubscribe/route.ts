import { NextRequest, NextResponse } from "next/server";
import { unsubscribe } from "@/lib/newsletter";

// Handles both the "Unsubscribe" button on /newsletter/unsubscribe and the
// one-click unsubscribe that Gmail/Outlook show next to the sender (RFC 8058),
// which POSTs here with the token in the URL.
export async function POST(req: NextRequest) {
  let token = new URL(req.url).searchParams.get("token") || "";
  if (!token && req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (typeof body.token === "string") token = body.token;
  }
  const result = await unsubscribe(token);
  if (!result.ok) return NextResponse.json({ error: "This unsubscribe link isn't valid." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
