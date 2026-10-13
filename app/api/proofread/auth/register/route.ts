import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email-verification";
import { notifyAdminsOfRequest } from "@/lib/proofread";

const schema = z.object({
  name: z.string().min(2, "Enter your full name").max(80),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  bio: z.string().max(500).optional(),
  // Optional: also ask to write news or articles with the same account.
  alsoWrite: z.enum(["NEWS_EDITOR", "ARTICLE_EDITOR"]).nullable().optional(),
});

// Proofreader sign-up. This endpoint can never create an admin: the account
// gets proofreader access (and, if asked, a News or Article writer role), and
// each stays PENDING until an admin approves it.
export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`register:${clientIp(req)}`, 5, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, password, bio, alsoWrite } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "An account with that email already exists. Sign in with it instead — you can ask for extra access (writing or proofreading) after signing in.",
      },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      bio,
      role: alsoWrite ?? "PROOFREADER",
      status: "PENDING",
      proofreaderStatus: "PENDING",
    },
  });

  const { devLink } = await sendVerificationEmail(user, "proofread");

  // Let admins know there's someone to approve on the Users page.
  await notifyAdminsOfRequest(
    "New proofreader request",
    `${name} (${email}) asked to join as a proofreader${
      alsoWrite ? ` and to write ${alsoWrite === "NEWS_EDITOR" ? "news" : "articles"}` : ""
    }.`
  );

  return NextResponse.json({
    ok: true,
    message: "Account created. Verify your email, then an admin will approve your access.",
    devLink,
  });
}
