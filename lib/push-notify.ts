import "server-only";
import { prisma } from "./prisma";
import { postHref } from "./types";
import { SITE_URL } from "./seo";
import { liveSince } from "./public-data";
import { pushConfigured, sendPush } from "./web-push";

// "New story" notifications for readers who turned on the bell on the site.
//
// notifyNewPosts() is called right after a story is published (CMS publish or
// proofreader approval) and every 15 minutes by the VPS scheduler (which also
// catches scheduled stories as they go live). Each story is announced once:
// posts.notifiedAt is set before sending, so repeated calls never re-send.

// Only stories that went live recently — older posts are never announced
// (e.g. when this feature is first switched on).
const RECENT_MS = 6 * 3600_000;
// More than this many new stories at once → one "N new stories" notification instead.
const MAX_SEPARATE = 3;
const CONCURRENCY = 10;
const MAX_FAILURES = 5;

type Payload = { title: string; body: string; url: string; image?: string; icon: string; tag: string };

const withUtm = (url: string) => `${url}${url.includes("?") ? "&" : "?"}utm_source=push&utm_medium=web_push`;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Sends one payload to every subscribed device; cleans up dead subscriptions. */
export async function sendToAll(payload: Payload, opts: { budgetMs?: number } = {}) {
  const deadline = Date.now() + (opts.budgetMs ?? 50_000);
  const subs = await prisma.pushSubscription.findMany({ select: { id: true, endpoint: true, p256dh: true, auth: true, failures: true } });
  let sent = 0;
  let removed = 0;
  let failed = 0;
  let index = 0;

  const worker = async () => {
    while (index < subs.length && Date.now() < deadline) {
      const sub = subs[index++];
      const result = await sendPush(sub, payload, { topic: payload.tag, urgency: "normal", ttlSeconds: 12 * 3600 });
      if (result === "sent") {
        sent++;
        if (sub.failures) await prisma.pushSubscription.updateMany({ where: { id: sub.id }, data: { failures: 0, lastSuccessAt: new Date() } });
        else await prisma.pushSubscription.updateMany({ where: { id: sub.id }, data: { lastSuccessAt: new Date() } });
      } else if (result === "gone" || sub.failures + 1 >= MAX_FAILURES) {
        removed++;
        await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
      } else {
        failed++;
        await prisma.pushSubscription.updateMany({ where: { id: sub.id }, data: { failures: sub.failures + 1 } });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, subs.length) }, worker));
  return { devices: subs.length, sent, removed, failed, unsent: subs.length - sent - removed - failed };
}

export async function notifyNewPosts(opts: { budgetMs?: number } = {}) {
  if (!pushConfigured()) return { posts: 0, skipped: "not configured" as const };
  const now = new Date();
  const recent = new Date(now.getTime() - RECENT_MS);

  const candidates = await prisma.post.findMany({
    where: {
      notifiedAt: null,
      OR: [
        { status: "PUBLISHED", publishedAt: { gte: recent, lte: now } },
        { status: "SCHEDULED", scheduledAt: { gte: recent, lte: now } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      slug: true,
      title: true,
      summary: true,
      status: true,
      publishedAt: true,
      scheduledAt: true,
      createdAt: true,
      featuredImageUrl: true,
      brandedFeaturedImageUrl: true,
    },
  });

  // Claim each story first, so a second call at the same moment can't announce it again.
  const claimed: typeof candidates = [];
  for (const p of candidates) {
    const r = await prisma.post.updateMany({ where: { id: p.id, notifiedAt: null }, data: { notifiedAt: now } });
    if (r.count === 1) claimed.push(p);
  }
  if (claimed.length === 0) return { posts: 0 };

  claimed.sort((a, b) => liveSince(b).getTime() - liveSince(a).getTime());
  const icon = `${SITE_URL}/icon-192.png`;
  const payloads: Payload[] =
    claimed.length > MAX_SEPARATE
      ? [
          {
            title: `${claimed.length} new stories on Buraaq Times`,
            body: clip(claimed.slice(0, 3).map((p) => p.title).join(" · "), 180),
            url: withUtm(`${SITE_URL}/`),
            icon,
            tag: "new-stories",
          },
        ]
      : claimed.map((p) => ({
          title: clip(p.title, 90),
          body: clip(p.summary.replace(/\s+/g, " ").trim(), 160),
          url: withUtm(`${SITE_URL}${postHref({ type: p.type as "news" | "article", slug: p.slug })}`),
          image: p.brandedFeaturedImageUrl || p.featuredImageUrl || undefined,
          icon,
          tag: `post-${p.id}`,
        }));

  const deadline = Date.now() + (opts.budgetMs ?? 50_000);
  const results = [];
  for (const payload of payloads) {
    results.push(await sendToAll(payload, { budgetMs: Math.max(1000, deadline - Date.now()) }));
  }
  const summary = { posts: claimed.length, notifications: payloads.length, results };
  console.log("[push] new-story notifications:", JSON.stringify(summary));
  return summary;
}

/** Called after a publish action; never lets a push problem affect publishing. */
export async function notifyNewPostsSafely() {
  try {
    await notifyNewPosts({ budgetMs: 8000 });
  } catch (e) {
    console.error("[push] notifyNewPosts failed:", e);
  }
}
