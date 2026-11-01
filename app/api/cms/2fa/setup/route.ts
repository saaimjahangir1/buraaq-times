import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { generateTotpSecret, otpauthUrl } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";

// Profile → "Move to a new phone": starts a new authenticator. The current one
// keeps working until a code from the new one is confirmed in /verify.
export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;
  const { ok } = await rateLimit(`2fa-profile:${guard.id}`, 10, 10 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: guard.id }, data: { totpPendingSecret: secret } });

  return NextResponse.json({ secret, otpauthUrl: otpauthUrl(secret, guard.email) });
}
