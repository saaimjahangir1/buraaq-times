import "server-only";
import { SITE_URL } from "./seo";

// IndexNow tells Bing (which also powers ChatGPT search), Yandex, Seznam and
// Naver about new and updated pages within minutes, instead of waiting for
// their crawlers to come back. The key isn't a secret: it's published at
// /<key>.txt (public/9fba9d65c0599a82aa9068477716c90c.txt) to prove the site is ours.
export const INDEXNOW_KEY = "9fba9d65c0599a82aa9068477716c90c";

export async function submitToIndexNow(urls: string[]) {
  const list = Array.from(new Set(urls)).slice(0, 10_000);
  if (list.length === 0) return { submitted: 0, status: 0 };
  const host = new URL(SITE_URL).host;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList: list }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  // 200 = accepted, 202 = accepted (key check pending). Anything else is logged by the caller.
  return { submitted: res.ok ? list.length : 0, status: res.status };
}
