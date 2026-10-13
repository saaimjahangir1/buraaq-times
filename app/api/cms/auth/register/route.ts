import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email-verification";
import { notifyAdminsOfRequest } from "@/lib/proofread";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  bio: z.string().max(500).optional(),
  role: z.enum(["NEWS_EDITOR", "ARTICLE_EDITOR"]),
  // Optional: also ask to proofread with the same account.
  alsoProofread: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`register:${clientIp(req)}`, 5, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, email, password, bio, role, alsoProofread } = parsed.data;

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
    data: { name, email, passwordHash, bio, role, status: "PENDING", proofreaderStatus: alsoProofread ? "PENDING" : null },
  });

  const { devLink } = await sendVerificationEmail(user);
  if (alsoProofread) {
    await notifyAdminsOfRequest(
      "New writer + proofreader request",
      `${name} (${email}) asked to write ${role === "NEWS_EDITOR" ? "news" : "articles"} and to proofread.`
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Account created. Check your email to verify it, and an admin will need to approve it before you can publish.",
    devLink,
  });
}
