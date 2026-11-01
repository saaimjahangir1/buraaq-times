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

/**
 * True only for real files in this site's Vercel Blob storage: an https address
 * whose host is <store>.public.blob.vercel-storage.com. (Checking the whole
 * address for the name isn't enough — "http://internal/?x=.public.blob.vercel-storage.com"
 * would pass, and the server would fetch an internal address.)
 */
export function isBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (u.port === "" || u.port === "443") &&
      /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(u.hostname)
    );
  } catch {
    return false;
  }
}

const MAX_FETCH_BYTES = 20 * 1024 * 1024;

/** Downloads one of our own Blob files: refuses other hosts, redirects and huge files. */
export async function fetchBlob(url: string): Promise<Buffer> {
  if (!isBlobUrl(url)) throw new Error("Not a Blob storage address");
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  if (Number(res.headers.get("content-length") || 0) > MAX_FETCH_BYTES) throw new Error("File too large");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_FETCH_BYTES) throw new Error("File too large");
  return bytes;
}
