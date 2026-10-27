import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Turning the bell off: forget this browser's subscription.
export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`push-unsub:${clientIp(req)}`, 30, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  if (typeof body.endpoint !== "string" || body.endpoint.length > 1000) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
  return NextResponse.json({ ok: true });
}
