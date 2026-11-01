import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPending2FAToken } from "@/lib/auth";
import { checkCode } from "@/lib/two-factor";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { issueSession } from "@/lib/session";

const schema = z.object({
  tempToken: z.string().min(1).max(2000),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`2fa:${clientIp(req)}`, 10, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const pending = await verifyPending2FAToken(parsed.data.tempToken, "2fa-pending");
  if (!pending) return NextResponse.json({ error: "Session expired — sign in again." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: pending.sub } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "Two-factor authentication is not set up. Sign in again." }, { status: 400 });
  }

  // Wrong codes are counted per account (5 → 5-minute pause); used codes can't be reused.
  const check = await checkCode(user, user.totpSecret, parsed.data.code);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  return issueSession(user, pending.remember, {}, pending.area);
}
