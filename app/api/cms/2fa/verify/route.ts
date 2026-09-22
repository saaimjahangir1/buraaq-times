import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { verifyTotp } from "@/lib/totp";
import { notify } from "@/lib/notifications";

const schema = z.object({ code: z.string().length(6) });

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: guard.id } });
  if (!user?.totpSecret) {
    return NextResponse.json({ error: "Start setup first." }, { status: 400 });
  }
  if (!verifyTotp(user.totpSecret, parsed.data.code)) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  await prisma.user.update({ where: { id: guard.id }, data: { totpEnabled: true } });
  await notify(guard.id, "ACCOUNT", "Two-factor authentication enabled", "2FA is now required at sign-in.");

  return NextResponse.json({ ok: true });
}
