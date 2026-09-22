import "server-only";

// In-memory sliding window — the fallback. Resets on redeploy and doesn't
// share state across serverless instances.
const hits = new Map<string, number[]>();

function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return { ok: false, remaining: 0 };
  }
  arr.push(now);
  hits.set(key, arr);
  return { ok: true, remaining: limit - arr.length };
}

// Distributed mode — used automatically when Upstash credentials are set,
// so rate limits actually hold across multiple serverless instances.
let upstash: { limit: (key: string, limit: number, windowMs: number) => Promise<{ ok: boolean; remaining: number }> } | null = null;

async function getUpstash() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (upstash) return upstash;

  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Cache one Ratelimit instance per (limit, windowMs) pair since Upstash's
  // Ratelimit is configured with fixed thresholds at construction time.
  const cache = new Map<string, InstanceType<typeof Ratelimit>>();
  upstash = {
    limit: async (key, limit, windowMs) => {
      const cacheKey = `${limit}:${windowMs}`;
      let rl = cache.get(cacheKey);
      if (!rl) {
        rl = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
        });
        cache.set(cacheKey, rl);
      }
      const res = await rl.limit(key);
      return { ok: res.success, remaining: res.remaining };
    },
  };
  return upstash;
}

/**
 * Rate-limits a key (e.g. `login:1.2.3.4`) to `limit` hits per `windowMs`.
 * Uses Upstash Redis when configured (distributed, safe for multiple
 * instances); otherwise falls back to an in-memory window.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; remaining: number }> {
  const distributed = await getUpstash();
  if (distributed) return distributed.limit(key, limit, windowMs);
  return memoryLimit(key, limit, windowMs);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
