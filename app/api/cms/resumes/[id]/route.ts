import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse } from "@/lib/cms-guard";
import { requireAdmin } from "@/lib/admin-guard";
import { driveFileName } from "@/lib/resume/stored";

export const dynamic = "force-dynamic";

// View a saved resume's PDF (admins only).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (isNextResponse(admin)) return admin;
  const r = await prisma.resume.findUnique({ where: { id: params.id }, select: { name: true, headline: true, createdAt: true, pdf: true } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const name = driveFileName(r);
  return new NextResponse(new Uint8Array(r.pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}

// Delete a saved resume without sending it to Drive (admins only).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;
  await prisma.resume.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
