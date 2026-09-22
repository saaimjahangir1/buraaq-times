import "server-only";
import { prisma } from "./prisma";
import { generateToken, tokenExpiry } from "./tokens";
import { sendMail } from "./mailer";
import { SITE_URL } from "./seo";

export async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const token = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyExpires: tokenExpiry(24) },
  });

  const link = `${SITE_URL}/cms/verify-email?token=${token}`;
  const { sent } = await sendMail({
    to: user.email,
    subject: "Verify your Buraaq Times CMS account",
    html: `<p>Hi ${user.name},</p><p>Confirm your email to finish setting up your CMS account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
  });

  // In dev without SMTP configured, hand the link back directly so the
  // flow is testable without standing up a real mail server.
  return { sent, devLink: sent || process.env.NODE_ENV === "production" ? undefined : link };
}
