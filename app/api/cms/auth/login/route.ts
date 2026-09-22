import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createPending2FAToken } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { issueSession } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`login:${clientIp(req)}`, 10, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }
  const { email, password, remember } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (user.totpEnabled) {
    const tempToken = await createPending2FAToken(user.id, Boolean(remember));
    return NextResponse.json({ requires2FA: true, tempToken });
  }

  return issueSession(user, Boolean(remember));
}
