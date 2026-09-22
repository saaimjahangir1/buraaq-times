import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { scoreComment } from "@/lib/spam";
import { notify } from "@/lib/notifications";

const schema = z.object({
  type: z.enum(["news", "article"]),
  slug: z.string().min(1),
  authorName: z.string().min(2).max(60),
  authorEmail: z.string().email(),
  body: z.string().min(2).max(2000),
});

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`comment:${clientIp(req)}`, 5, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many comments — try again in a minute." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { type, slug, authorName, authorEmail, body } = parsed.data;

  const post = await prisma.post.findFirst({ where: { type, slug }, select: { id: true, title: true, authorId: true } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const spam = await scoreComment(body, authorName);

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      authorName,
      authorEmail,
      body,
      status: spam.autoFlag ? "SPAM" : "PENDING",
      spamScore: spam.score,
      spamReason: spam.reason,
    },
  });

  if (!spam.autoFlag) {
    await notify(
      post.authorId,
      "COMMENT_ALERT",
      "New comment awaiting moderation",
      `${authorName} commented on "${post.title}".`,
      "/cms/comments"
    );
  }

  return NextResponse.json({
    comment: { id: comment.id, name: authorName, text: body },
    flagged: spam.autoFlag,
  });
}
