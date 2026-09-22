import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

export async function GET() {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;

  const comments = await prisma.comment.findMany({
    where: guard.role === "ADMIN" ? {} : { post: { authorId: guard.id } },
    orderBy: { createdAt: "desc" },
    include: { post: { select: { title: true, slug: true, type: true } } },
    take: 200,
  });
  return NextResponse.json({ comments });}
