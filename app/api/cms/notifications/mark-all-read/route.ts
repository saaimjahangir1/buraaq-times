import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  await prisma.notification.updateMany({
    where: { userId: guard.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
