import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { notify } from "@/lib/notifications";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  role: z.enum(["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;
  if (guard.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const before = await prisma.user.findUnique({ where: { id: params.id }, select: { status: true } });
  const user = await prisma.user.update({ where: { id: params.id }, data: parsed.data });

  if (parsed.data.status && parsed.data.status !== before?.status) {
    if (parsed.data.status === "APPROVED") {
      await notify(user.id, "ACCOUNT", "Account approved", "You can now publish on Buraaq Times.");
    } else if (parsed.data.status === "REJECTED") {
      await notify(user.id, "ACCOUNT", "Account not approved", "An admin has declined your account.");
    }
  }

  return NextResponse.json({ user });
}
