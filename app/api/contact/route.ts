import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMail } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const CONTACT_EMAIL = "theburaaqtimes@gmail.com";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
});

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`contact:${clientIp(req)}`, 5, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many messages — please try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, subject, message } = parsed.data;

  const html = `
    <h2>New message from the Buraaq Times contact form</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
  `;

  const { sent } = await sendMail({
    to: CONTACT_EMAIL,
    subject: `[Contact Form] ${subject || "New message"} — from ${name}`,
    html,
    replyTo: email,
  });

  if (!sent) {
    return NextResponse.json(
      { error: "Message could not be sent right now. Please try again later." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
