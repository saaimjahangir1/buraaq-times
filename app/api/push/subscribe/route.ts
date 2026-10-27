import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isPushEndpoint, pushConfigured, sendPush } from "@/lib/web-push";
import { SITE_URL } from "@/lib/seo";

const schema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(80).max(120), auth: z.string().min(16).max(40) }),
  // When the browser renews its subscription it sends the old address so we can replace it.
  oldEndpoint: z.string().url().max(1000).optional().nullable(),
});

// The bell on the site: saves this browser's push subscription and sends a
// "you're subscribed" notification so the reader can see it works.
export async function POST(req: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ error: "Notifications aren't set up on this site yet." }, { status: 503 });
  const { ok } = await rateLimit(`push-sub:${clientIp(req)}`, 20, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isPushEndpoint(parsed.data.endpoint)) {
    return NextResponse.json({ error: "This browser's notification service isn't supported." }, { status: 400 });
  }
  const { endpoint, keys, oldEndpoint } = parsed.data;
  if (oldEndpoint && oldEndpoint !== endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint: oldEndpoint } });

  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { id: true } });
  const userAgent = (req.headers.get("user-agent") || "").slice(0, 200);
  if (existing) {
    await prisma.pushSubscription.update({ where: { endpoint }, data: { p256dh: keys.p256dh, auth: keys.auth, failures: 0, userAgent } });
  } else {
    await prisma.pushSubscription.create({ data: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent } });
  }

  if (!oldEndpoint && !existing) {
    const result = await sendPush(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth },
      {
        title: "You're subscribed to Buraaq Times",
        body: "We'll let you know here when a new story or article is published.",
        url: `${SITE_URL}/`,
        icon: `${SITE_URL}/icon-192.png`,
        tag: "welcome",
      },
      { urgency: "high", ttlSeconds: 600 }
    );
    if (result === "gone") {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
      return NextResponse.json({ error: "Your browser's notification service rejected the subscription. Please try again." }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true });
}
