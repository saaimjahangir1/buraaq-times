import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPasswordOrDummy, needsRehash, hashPassword, createPending2FAToken, isTrustedDevice, trustCookieName } from "@/lib/auth";
import { issueSession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
  remember: z.boolean().optional(),
  // Which sign-in this is: the editorial CMS (default) or the proofreading desk.
  area: z.enum(["cms", "desk"]).optional(),
});

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`login:${clientIp(req)}`, 10, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }
  const { email, password, remember } = parsed.data;
  const area = parsed.data.area ?? "cms";

  // Also limit per account, so one password can't be guessed from many addresses.
  const perAccount = await rateLimit(`login-account:${email.toLowerCase()}`, 20, 15 * 60_000);
  if (!perAccount.ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!(await verifyPasswordOrDummy(password, user?.passwordHash)) || !user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Older passwords were stored with a lower bcrypt cost — upgrade quietly.
  if (needsRehash(user.passwordHash)) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  }

  // Two-factor sign-in is required for every account. Nobody gets a session
  // from the password alone: either enter a code, or set up an authenticator first.
  if (user.totpEnabled && user.totpSecret) {
    // "Remember me" was ticked when this browser last entered a code, less than 7 days ago.
    if (await isTrustedDevice(req.cookies.get(trustCookieName(user.id))?.value, user)) {
      return issueSession(user, Boolean(remember), { trustedDevice: true }, area);
    }
    const tempToken = await createPending2FAToken(user.id, Boolean(remember), area, "2fa-pending");
    return NextResponse.json({ requires2FA: true, tempToken });
  }
  const setupToken = await createPending2FAToken(user.id, Boolean(remember), area, "2fa-setup");
  return NextResponse.json({ requires2FASetup: true, setupToken });
}
