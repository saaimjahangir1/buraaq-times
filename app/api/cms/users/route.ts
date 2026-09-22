import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

export async function GET() {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;
  if (guard.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      bio: true,
      createdAt: true,
      _count: { select: { posts: true } },
    },
  });
  return NextResponse.json({ users });
}
