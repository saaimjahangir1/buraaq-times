import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { normalizeEmail, requestSubscription } from "@/lib/newsletter";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
  // Honeypot: a hidden field real people never fill in.
  website: z.string().optional(),
});

const OK_MESSAGE = "Almost done — check your inbox and click the link to confirm.";

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  // Bots that fill the hidden field get a normal-looking reply and nothing else.
  if (parsed.data.website) return NextResponse.json({ ok: true, message: OK_MESSAGE });

  const email = normalizeEmail(parsed.data.email);
  // Limit per visitor, and per address so nobody can flood someone's inbox
  // with confirmation emails.
  const [ip, addr] = await Promise.all([
    rateLimit(`newsletter:ip:${clientIp(req)}`, 5, 60 * 60_000),
    rateLimit(`newsletter:email:${email}`, 3, 24 * 60 * 60_000),
  ]);
  if (!ip.ok) {
    return NextResponse.json({ error: "Too many sign-ups from here — try again in an hour." }, { status: 429 });
  }
  if (!addr.ok) return NextResponse.json({ ok: true, message: OK_MESSAGE });

  try {
    const { devLink } = await requestSubscription(email);
    // Same reply whether or not the address was already subscribed.
    return NextResponse.json({ ok: true, message: OK_MESSAGE, devLink });
  } catch (err) {
    console.error("[newsletter] subscribe failed:", err);
    return NextResponse.json({ error: "Couldn't sign you up right now. Please try again later." }, { status: 500 });
  }
}
