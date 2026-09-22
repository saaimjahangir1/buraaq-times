import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getOrCreateVisitorId } from "@/lib/visitor";

const VALID_TYPES = ["LIKE", "SAVE"] as const;

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`reaction:${clientIp(req)}`, 30, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { type: postType, slug, reaction } = await req.json().catch(() => ({}));
  if (!postType || !slug || !VALID_TYPES.includes(reaction)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const post = await prisma.post.findFirst({ where: { type: postType, slug }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visitorId = getOrCreateVisitorId();
  const countField = reaction === "LIKE" ? "likeCount" : "saveCount";

  const existing = await prisma.postReaction.findUnique({
    where: { postId_visitorId_type: { postId: post.id, visitorId, type: reaction } },
  });

  let active: boolean;
  let updated: { likeCount: number; saveCount: number };

  if (existing) {
    const [, post2] = await prisma.$transaction([
      prisma.postReaction.delete({ where: { id: existing.id } }),
      prisma.post.update({
        where: { id: post.id },
        data: { [countField]: { decrement: 1 } },
        select: { likeCount: true, saveCount: true },
      }),
    ]);
    updated = post2;
    active = false;
  } else {
    const [, post2] = await prisma.$transaction([
      prisma.postReaction.create({ data: { postId: post.id, visitorId, type: reaction } }),
      prisma.post.update({
        where: { id: post.id },
        data: { [countField]: { increment: 1 } },
        select: { likeCount: true, saveCount: true },
      }),
    ]);
    updated = post2;
    active = true;
  }

  return NextResponse.json({ active, likeCount: updated.likeCount, saveCount: updated.saveCount });
}
