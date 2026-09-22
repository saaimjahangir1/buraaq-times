import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;

  const revisions = await prisma.postRevision.findMany({
    where: { postId: params.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { editor: { select: { name: true } } },
  });
  return NextResponse.json({ revisions });
}
