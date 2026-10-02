import "server-only";
import { put, del } from "@vercel/blob";

// Same timestamp+random naming scheme the old local-disk code used —
// keeping it means the migration script (uploading existing files) can
// preserve each file's exact existing name as its Blob pathname.
export async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const blob = await put(filename, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
  return blob.url;
}

export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (err) {
    console.error(`Could not delete blob ${url}:`, err);
  }
}

export function isBlobUrl(url: string): boolean {
  return url.includes(".public.blob.vercel-storage.com");
}
