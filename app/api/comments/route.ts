import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { scoreComment } from "@/lib/spam";
import { notify } from "@/lib/notifications";
import type { CommentView } from "@/lib/types";

const schema = z.object({
  type: z.enum(["news", "article"]),
  slug: z.string().min(1).max(200),
  authorName: z.string().trim().min(2).max(60),
  authorEmail: z.string().trim().email().max(254),
  body: z.string().trim().min(2).max(2000),
  // Replying: the comment being answered (a top-level comment or a reply).
  parentId: z.string().max(40).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`comment:${clientIp(req)}`, 5, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many comments — try again in a minute." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { type, slug, authorName, authorEmail, body, parentId } = parsed.data;

  const post = await prisma.post.findFirst({ where: { type, slug }, select: { id: true, title: true, authorId: true } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Replies stay one level deep: answering a reply puts the new one in the same
  // thread, addressed to that person ("@Name").
  let thread: { parentId: string; replyToName: string } | null = null;
  if (parentId) {
    const target = await prisma.comment.findFirst({
      where: { id: parentId, postId: post.id, status: "APPROVED" },
      select: { id: true, parentId: true, authorName: true },
    });
    if (!target) return NextResponse.json({ error: "That comment can't be replied to any more." }, { status: 404 });
    thread = { parentId: target.parentId ?? target.id, replyToName: target.authorName };
  }

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
      parentId: thread?.parentId ?? null,
      replyToName: thread?.replyToName ?? null,
    },
  });

  if (!spam.autoFlag) {
    await notify(
      post.authorId,
      "COMMENT_ALERT",
      thread ? "New reply awaiting moderation" : "New comment awaiting moderation",
      thread ? `${authorName} replied to ${thread.replyToName} on "${post.title}".` : `${authorName} commented on "${post.title}".`,
      "/cms/comments"
    );
  }

  const view: CommentView = {
    id: comment.id,
    name: authorName,
    text: body,
    createdAt: comment.createdAt.toISOString(),
    likes: 0,
    dislikes: 0,
    myVote: null,
    replyToName: comment.replyToName,
    replies: [],
    pending: true,
  };
  return NextResponse.json({ comment: view, parentId: comment.parentId, flagged: spam.autoFlag });
}
