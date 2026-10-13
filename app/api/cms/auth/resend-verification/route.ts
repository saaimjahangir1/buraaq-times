import { NextRequest, NextResponse } from "next/server";
import { getSession, parseArea } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email-verification";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`resend-verify:${clientIp(req)}`, 3, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const area = parseArea(req.nextUrl.searchParams.get("area"));
  const session = await getSession(area);
  let user = session ? await prisma.user.findUnique({ where: { id: session.sub } }) : null;

  if (!user) {
    const { email } = await req.json().catch(() => ({}));
    if (email) user = await prisma.user.findUnique({ where: { email } });
  }

  // Always return a generic success message — never reveal whether an
  // email address exists in the system.
  if (user && !user.emailVerified) {
    // From the desk, the link brings them back to the desk.
    const { devLink } = await sendVerificationEmail(user, area === "desk" ? "proofread" : undefined);
    return NextResponse.json({ ok: true, devLink });
  }
  return NextResponse.json({ ok: true });
}
