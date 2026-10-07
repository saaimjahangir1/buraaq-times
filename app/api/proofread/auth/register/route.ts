import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email-verification";
import { notify } from "@/lib/notifications";

const schema = z.object({
  name: z.string().min(2, "Enter your full name").max(80),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  bio: z.string().max(500).optional(),
});

// Proofreader sign-up. The role is fixed here — this endpoint can never create
// an editor or admin — and the account stays PENDING until an admin approves it.
export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`register:${clientIp(req)}`, 5, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, password, bio } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, bio, role: "PROOFREADER", status: "PENDING" },
  });

  const { devLink } = await sendVerificationEmail(user);

  // Let admins know there's someone to approve on the Users page.
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      notify(a.id, "ACCOUNT", "New proofreader request", `${name} (${email}) asked to join as a proofreader.`, "/cms/users")
    )
  );

  return NextResponse.json({
    ok: true,
    message: "Account created. Verify your email, then an admin will approve your access.",
    devLink,
  });
}
