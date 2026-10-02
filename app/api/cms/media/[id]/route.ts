import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob-storage";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handles both Blob URLs (current) and legacy local /uploads/ URLs, in
  // case anything wasn't migrated yet when this runs.
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  for (const url of [media.url, media.originalUrl].filter(Boolean) as string[]) {
    try {
      if (isBlobUrl(url)) {
        await deleteFromBlob(url);
      } else if (url.startsWith("/uploads/") && !url.includes("..")) {
        await unlink(path.join(uploadDir, url.replace("/uploads/", "")));
      }
    } catch (err) {
      console.error(`Could not delete file for media ${media.id} (${url}):`, err);
    }
  }

  await prisma.media.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
