import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, requireProofreader, isNextResponse } from "@/lib/cms-guard";
import { smartCropTo16x9, shouldSkipCropping } from "@/lib/image-processing";
import { uploadToBlob } from "@/lib/blob-storage";
import { checkImageUpload, MAX_IMAGE_BYTES } from "@/lib/upload-check";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // The proofreading desk sees the whole library, so a proofreader can pick
  // any of the site's images for a story; writers see their own uploads.
  const forDesk = req.nextUrl.searchParams.get("for") === "desk";
  const guard = forDesk ? await requireProofreader() : await requireApprovedUser();
  if (isNextResponse(guard)) return guard;

  const media = await prisma.media.findMany({
    where: guard.role === "ADMIN" || forDesk ? {} : { uploadedById: guard.id },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
    take: 200,
  });
  return NextResponse.json({ media });
}

export async function POST(req: NextRequest) {
  // Proofreaders can upload too (to change a story's featured image on the desk).
  const guard = await requireApprovedUser(req, { allowProofreader: true });
  if (isNextResponse(guard)) return guard;

  const { ok } = await rateLimit(`upload:${guard.id}`, 60, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many uploads — try again later." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const altText = String(form?.get("altText") ?? "").slice(0, 300);
  const crop = form?.get("crop") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  // The type comes from the file itself, not from the browser or the file name.
  const check = await checkImageUpload(bytes);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  let mimeType: string = check.mime;
  let ext = check.ext;
  let originalUrl: string | null = null;

  if (crop && !shouldSkipCropping(mimeType)) {
    try {
      const originalFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-original${ext}`;
      originalUrl = await uploadToBlob(bytes, originalFilename, mimeType);

      const cropped = await smartCropTo16x9(bytes);
      bytes = cropped.buffer;
      mimeType = cropped.contentType;
      ext = ".jpg";
    } catch (err) {
      console.error("Image crop failed, storing original instead:", err);
      originalUrl = null;
    }
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const url = await uploadToBlob(bytes, filename, mimeType);

  const media = await prisma.media.create({
    data: {
      url,
      originalUrl,
      filename: file.name.replace(/[\u0000-\u001f<>"\\/]/g, "").slice(0, 200) || "image",
      mimeType,
      size: bytes.length,
      altText,
      uploadedById: guard.id,
    },
  });

  return NextResponse.json({ media });
}
