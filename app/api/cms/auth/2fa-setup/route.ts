import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPending2FAToken } from "@/lib/auth";
import { generateTotpSecret, otpauthUrl } from "@/lib/totp";
import { checkCode } from "@/lib/two-factor";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { issueSession, rememberDevice } from "@/lib/session";
import { notify } from "@/lib/notifications";

// Sign-in step for accounts without two-factor sign-in yet (it's required for
// everyone). Reached only with the short-lived "2fa-setup" token that the
// password step returns — never with a session.
//   { setupToken }        → a new authenticator secret + QR link
//   { setupToken, code }  → confirms the app works, turns 2FA on, signs in

const schema = z.object({
  setupToken: z.string().min(1).max(2000),
  code: z.string().length(6).optional(),
});

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`2fa-setup:${clientIp(req)}`, 15, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const pending = await verifyPending2FAToken(parsed.data.setupToken, "2fa-setup");
  if (!pending) return NextResponse.json({ error: "This step expired — sign in again." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: pending.sub } });
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (user.totpEnabled && user.totpSecret) {
    return NextResponse.json({ error: "Two-factor sign-in is already set up. Sign in again." }, { status: 409 });
  }

  if (!parsed.data.code) {
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpPendingSecret: secret } });
    return NextResponse.json({ secret, otpauthUrl: otpauthUrl(secret, user.email) });
  }

  if (!user.totpPendingSecret) return NextResponse.json({ error: "Start the setup again." }, { status: 400 });
  const check = await checkCode(user, user.totpPendingSecret, parsed.data.code, { allowReuse: true });
  if (!check.ok) {
    const error = check.status === 401 ? "Incorrect code — check the time on your phone and try again." : check.error;
    return NextResponse.json({ error }, { status: check.status });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: user.totpPendingSecret, totpPendingSecret: null, totpEnabled: true, totpLastStep: check.step },
  });
  await notify(user.id, "ACCOUNT", "Two-factor authentication enabled", "A code from your authenticator app is now needed at sign-in.");
  const res = await issueSession(updated, pending.remember, {}, pending.area);
  if (pending.remember) await rememberDevice(res, updated);
  return res;
}
