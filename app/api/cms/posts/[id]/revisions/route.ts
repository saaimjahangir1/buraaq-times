import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;

  // Same rule as opening the post: your own posts, or any post for admins.
  const post = await prisma.post.findUnique({ where: { id: params.id }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (guard.role !== "ADMIN" && post.authorId !== guard.id) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }

  const revisions = await prisma.postRevision.findMany({
    where: { postId: params.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { editor: { select: { name: true } } },
  });
  return NextResponse.json({ revisions });
}
