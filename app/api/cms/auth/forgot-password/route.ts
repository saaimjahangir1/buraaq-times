import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateToken, tokenExpiry } from "@/lib/tokens";
import { sendMail } from "@/lib/mailer";
import { SITE_URL } from "@/lib/seo";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`forgot-password:${clientIp(req)}`, 5, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  let devLink: string | undefined;
  if (user) {
    const token = generateToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: tokenExpiry(1) },
    });
    const link = `${SITE_URL}/cms/reset-password?token=${token}`;
    const { sent } = await sendMail({
      to: user.email,
      subject: "Reset your Buraaq Times CMS password",
      html: `<p>Hi ${user.name},</p><p>Reset your password here (expires in 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    });
    if (!sent && process.env.NODE_ENV !== "production") devLink = link;
  }

  // Always the same response, whether or not the account exists.
  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
    devLink,
  });
}
