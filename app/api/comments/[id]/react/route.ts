import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getOrCreateVisitorId } from "@/lib/visitor";
import { notify } from "@/lib/notifications";

// 👍 / 👎 / Report on a public comment, one of each per visitor (anonymous
// browser id, like the article Like button). Like and dislike exclude each
// other; clicking the active one again takes it back.

const schema = z.object({ reaction: z.enum(["LIKE", "DISLIKE", "REPORT"]) });
// Reports from this many different visitors hide a comment until a moderator looks.
const HIDE_AFTER_REPORTS = 3;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { ok } = await rateLimit(`comment-react:${clientIp(req)}`, 40, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many requests — slow down a little." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { reaction } = parsed.data;

  const comment = await prisma.comment.findFirst({
    where: { id: params.id, status: "APPROVED" },
    select: { id: true, authorName: true, post: { select: { authorId: true, title: true } } },
  });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const visitorId = getOrCreateVisitorId();
  const key = (type: string) => ({ commentId_visitorId_type: { commentId: comment.id, visitorId, type } });
  const has = async (type: string) => Boolean(await prisma.commentReaction.findUnique({ where: key(type) }));
  const add = async (type: string) => {
    try {
      await prisma.commentReaction.create({ data: { commentId: comment.id, visitorId, type } });
      return true;
    } catch {
      return false; // already there (double click / two tabs)
    }
  };
  const remove = async (type: string) => (await prisma.commentReaction.deleteMany({ where: { commentId: comment.id, visitorId, type } })).count > 0;

  if (reaction === "REPORT") {
    if (await add("REPORT")) {
      const updated = await prisma.comment.update({ where: { id: comment.id }, data: { reportCount: { increment: 1 } }, select: { reportCount: true } });
      if (updated.reportCount === 1) {
        await notify(comment.post.authorId, "COMMENT_ALERT", "A reader reported a comment", `${comment.authorName}'s comment on "${comment.post.title}" was reported.`, "/cms/comments");
      }
      if (updated.reportCount >= HIDE_AFTER_REPORTS) {
        await prisma.comment.updateMany({ where: { id: comment.id, status: "APPROVED" }, data: { status: "PENDING" } });
      }
    }
    return NextResponse.json({ reported: true });
  }

  const other = reaction === "LIKE" ? "DISLIKE" : "LIKE";
  const field = (t: string) => (t === "LIKE" ? "likeCount" : "dislikeCount");
  const change: Record<string, { increment: number } | { decrement: number }> = {};

  if (await has(reaction)) {
    if (await remove(reaction)) change[field(reaction)] = { decrement: 1 };
  } else {
    if (await add(reaction)) change[field(reaction)] = { increment: 1 };
    if (await remove(other)) change[field(other)] = { decrement: 1 };
  }

  const counts = Object.keys(change).length
    ? await prisma.comment.update({ where: { id: comment.id }, data: change, select: { likeCount: true, dislikeCount: true } })
    : await prisma.comment.findUniqueOrThrow({ where: { id: comment.id }, select: { likeCount: true, dislikeCount: true } });

  const mine = (await has("LIKE")) ? "LIKE" : (await has("DISLIKE")) ? "DISLIKE" : null;
  return NextResponse.json({ likes: Math.max(0, counts.likeCount), dislikes: Math.max(0, counts.dislikeCount), myVote: mine });
}
