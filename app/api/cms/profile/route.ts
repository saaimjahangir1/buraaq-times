import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id: guard.id }, data: parsed.data });
  return NextResponse.json({ user });
}
