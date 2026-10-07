import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { generateBrandedImages } from "@/lib/image-processing";
import { uploadToBlob, isBlobUrl } from "@/lib/blob-storage";

const schema = z.object({
  sourceUrl: z.string().min(1),
  title: z.string().min(1),
  categoryId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  // Proofreaders may regenerate these when they change a headline, since the
  // headline is baked into the image.
  const guard = await requireApprovedUser(req, { allowProofreader: true });
  if (isNextResponse(guard)) return guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { sourceUrl, title, categoryId } = parsed.data;

  if (!isBlobUrl(sourceUrl)) {
    return NextResponse.json({ error: "Invalid source image" }, { status: 400 });
  }

  let categoryName = "News";
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (category) categoryName = category.name;
  }

  const mediaRow = await prisma.media.findFirst({ where: { url: sourceUrl } });
  const effectiveSourceUrl = mediaRow?.originalUrl || sourceUrl;

  let sourceBytes: Buffer;
  try {
    const res = await fetch(effectiveSourceUrl);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    sourceBytes = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error("Could not fetch source image from Blob:", err);
    return NextResponse.json({ error: "Source image not found" }, { status: 404 });
  }

  let generated;
  try {
    generated = await generateBrandedImages(sourceBytes, { title, category: categoryName });
  } catch (err) {
    console.error("Branded image generation failed:", err);
    return NextResponse.json({ error: "Failed to generate branded images" }, { status: 500 });
  }

  const stamp = Date.now();
  const heroFilename = `${stamp}-${Math.random().toString(36).slice(2, 8)}-branded-hero.jpg`;
  const socialFilename = `${stamp}-${Math.random().toString(36).slice(2, 8)}-branded-social.jpg`;

  const [heroUrl, socialUrl] = await Promise.all([
    uploadToBlob(generated.hero.buffer, heroFilename, "image/jpeg"),
    uploadToBlob(generated.social.buffer, socialFilename, "image/jpeg"),
  ]);

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
