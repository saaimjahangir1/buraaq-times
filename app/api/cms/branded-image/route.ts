import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { generateBrandedImages } from "@/lib/image-processing";

const schema = z.object({
  sourceUrl: z.string().min(1),
  title: z.string().min(1),
  categoryId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { sourceUrl, title, categoryId } = parsed.data;

  if (!sourceUrl.startsWith("/uploads/") || sourceUrl.includes("..")) {
    return NextResponse.json({ error: "Invalid source image" }, { status: 400 });
  }

  let categoryName = "News";
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (category) categoryName = category.name;
  }

  // Prefer the pre-crop original on record so the portrait export isn't
  // upscaled from an already-16:9-cropped source.
  const mediaRow = await prisma.media.findFirst({ where: { url: sourceUrl } });
  const effectiveSourceUrl = mediaRow?.originalUrl || sourceUrl;

  let sourceBytes: Buffer;
  try {
    sourceBytes = await readFile(path.join(process.cwd(), "public", effectiveSourceUrl));
  } catch {
    return NextResponse.json({ error: "Source image not found on disk" }, { status: 404 });
  }

  let generated;
  try {
    generated = await generateBrandedImages(sourceBytes, { title, category: categoryName });
  } catch (err) {
    console.error("Branded image generation failed:", err);
    return NextResponse.json({ error: "Failed to generate branded images" }, { status: 500 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const stamp = Date.now();
  const heroFilename = `${stamp}-${Math.random().toString(36).slice(2, 8)}-branded-hero.jpg`;
  const socialFilename = `${stamp}-${Math.random().toString(36).slice(2, 8)}-branded-social.jpg`;

  await writeFile(path.join(uploadDir, heroFilename), generated.hero.buffer);
  await writeFile(path.join(uploadDir, socialFilename), generated.social.buffer);

  const heroUrl = `/uploads/${heroFilename}`;
  const socialUrl = `/uploads/${socialFilename}`;

  await prisma.media.createMany({
    data: [
      {
        url: heroUrl,
        filename: heroFilename,
        mimeType: "image/jpeg",
        size: generated.hero.buffer.length,
        altText: `${title} — branded featured image`,
        uploadedById: guard.id,
      },
      {
        url: socialUrl,
        filename: socialFilename,
        mimeType: "image/jpeg",
        size: generated.social.buffer.length,
        altText: `${title} — branded social image`,
        uploadedById: guard.id,
      },
    ],
  });

  return NextResponse.json({ heroUrl, socialUrl });
}
