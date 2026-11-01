import "server-only";
import sharp from "sharp";

// Upload checks for images. The browser's "file type" and the file name are
// both chosen by whoever uploads, so neither is trusted: the type comes from
// the file's own first bytes, and the image must really open as that type.
// SVG isn't accepted — it can carry scripts.

export const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
} as const;
export type ImageMime = keyof typeof IMAGE_TYPES;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Guards against "decompression bombs" (tiny files that expand to huge images).
const MAX_PIXELS = 50_000_000;

/** The real image type from the file's first bytes, or null. */
export function sniffImageType(b: Buffer): ImageMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (b.length >= 6 && (b.toString("latin1", 0, 6) === "GIF87a" || b.toString("latin1", 0, 6) === "GIF89a")) return "image/gif";
  return null;
}

export type ImageCheck = { ok: true; mime: ImageMime; ext: string } | { ok: false; error: string };

export async function checkImageUpload(bytes: Buffer): Promise<ImageCheck> {
  if (bytes.length === 0) return { ok: false, error: "The file is empty" };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "File too large (max 8MB)" };
  const mime = sniffImageType(bytes);
  if (!mime) return { ok: false, error: "Only JPG, PNG, WebP and GIF images can be uploaded" };
  try {
    const meta = await sharp(bytes, { limitInputPixels: MAX_PIXELS, animated: mime === "image/gif" }).metadata();
    const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[mime];
    if (meta.format !== expected || !meta.width || !meta.height) {
      return { ok: false, error: "That file isn't a valid image" };
    }
    if (meta.width * meta.height > MAX_PIXELS) return { ok: false, error: "That image is too large (max 50 megapixels)" };
  } catch {
    return { ok: false, error: "That file isn't a valid image (or it's too large)" };
  }
  return { ok: true, mime, ext: IMAGE_TYPES[mime] };
}
