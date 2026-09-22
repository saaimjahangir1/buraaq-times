import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`view:${clientIp(req)}`, 60, 60_000);
  if (!ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { type, slug } = await req.json().catch(() => ({}));
  if (!type || !slug) return NextResponse.json({ error: "Missing type/slug" }, { status: 400 });

  try {
    await prisma.post.updateMany({
      where: { type, slug },
      data: { views: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
