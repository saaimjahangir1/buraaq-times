import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { generateTotpSecret, otpauthUrl } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: guard.id },
    // Stored immediately but inert — totpEnabled stays false until the
    // user proves possession by submitting a valid code in /verify.
    data: { totpSecret: secret, totpEnabled: false },
  });

  return NextResponse.json({ secret, otpauthUrl: otpauthUrl(secret, guard.email) });
}
