import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { smartCropTo16x9, shouldSkipCropping } from "@/lib/image-processing";

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export async function GET() {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;

  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
    take: 200,
  });
  return NextResponse.json({ media });
}

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const form = await req.formData();
  const file = form.get("file");
  const altText = (form.get("altText") as string) || "";
  const crop = form.get("crop") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  let mimeType = file.type;
  let ext = path.extname(file.name) || "";
  let originalUrl: string | null = null;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  if (crop && !shouldSkipCropping(file.type)) {
    try {
      // Keep the pre-crop original too — the 16:9 crop is what the site
      // displays, but building other aspect ratios later (branded social
      // image) needs the full, uncropped source to avoid upscaling.
      const originalFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-original${ext}`;
      await writeFile(path.join(uploadDir, originalFilename), bytes);
      originalUrl = `/uploads/${originalFilename}`;

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
  await writeFile(path.join(uploadDir, filename), bytes);

  const media = await prisma.media.create({
    data: {
      url: `/uploads/${filename}`,
      originalUrl,
      filename: file.name,
      mimeType,
      size: bytes.length,
      altText,
      uploadedById: guard.id,
    },
  });

  return NextResponse.json({ media });
}
