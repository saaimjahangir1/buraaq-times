import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { verifyPassword } from "@/lib/auth";
import { notify } from "@/lib/notifications";

const schema = z.object({ password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter your password" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: guard.id } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: guard.id },
    data: { totpEnabled: false, totpSecret: null },
  });
  await notify(guard.id, "ACCOUNT", "Two-factor authentication disabled", "2FA is no longer required at sign-in.");

  return NextResponse.json({ ok: true });
}
