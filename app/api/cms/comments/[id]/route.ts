import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

const schema = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "SPAM"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const comment = await prisma.comment.findUnique({ where: { id: params.id }, include: { post: true } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (guard.role !== "ADMIN" && comment.post.authorId !== guard.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updated = await prisma.comment.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ comment: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const comment = await prisma.comment.findUnique({ where: { id: params.id }, include: { post: true } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (guard.role !== "ADMIN" && comment.post.authorId !== guard.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
