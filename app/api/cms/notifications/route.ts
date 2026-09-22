import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

export async function GET() {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: guard.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { userId: guard.id, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
