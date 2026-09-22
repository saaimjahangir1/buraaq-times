import "server-only";
import nodemailer from "nodemailer";

interface MailInput {
  to: string;
  subject: string;
  html: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transporter;
}

/**
 * Sends an email if SMTP is configured; otherwise logs it to the console.
 * Always returns { sent: boolean } so callers can decide whether to also
 * surface the content directly (e.g. in a dev-only API response) when
 * nothing was actually delivered.
 */
export async function sendMail({ to, subject, html }: MailInput): Promise<{ sent: boolean }> {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[mailer] SMTP not configured — would have sent:\nTo: ${to}\nSubject: ${subject}\n${html}\n`);
    return { sent: false };
  }
  await t.sendMail({ from: process.env.SMTP_FROM || "Buraaq Times <no-reply@buraaqtimes.example>", to, subject, html });
  return { sent: true };
}
