import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { runDailyDigest, sendDigestPreview } from "@/lib/newsletter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** GET — stats, recent issues and subscribers; ?format=csv exports active subscribers. */
export async function GET(req: NextRequest) {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;
  if (guard.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "csv") {
    const rows = await prisma.subscriber.findMany({
      where: { status: "ACTIVE" },
      orderBy: { confirmedAt: "asc" },
      select: { email: true, confirmedAt: true },
    });
    const csv = ["email,confirmed_at", ...rows.map((r) => `${csvCell(r.email)},${r.confirmedAt?.toISOString() ?? ""}`)].join("\n");
    return new NextResponse(csv + "\n", {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="buraaq-subscribers.csv"`,
      },
    });
  }

  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const [active, pending, unsubscribed, issues, subscribers] = await Promise.all([
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
    prisma.subscriber.count({ where: { status: "PENDING" } }),
    prisma.subscriber.count({ where: { status: "UNSUBSCRIBED" } }),
    prisma.newsletterIssue.findMany({ orderBy: { createdAt: "desc" }, take: 14 }),
    prisma.subscriber.findMany({
      where: {
        ...(status === "ACTIVE" || status === "PENDING" || status === "UNSUBSCRIBED" ? { status } : {}),
        ...(q ? { email: { contains: q } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, email: true, status: true, createdAt: true, confirmedAt: true, lastSentAt: true },
    }),
  ]);

  return NextResponse.json({
    stats: { active, pending, unsubscribed },
    issues: issues.map((i) => ({ ...i, stories: (JSON.parse(i.postIds || "[]") as string[]).length })),
    subscribers,
    cronConfigured: Boolean(process.env.CRON_SECRET),
  });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send-test") }),
  z.object({ action: z.literal("send-now") }),
  z.object({ action: z.literal("remove"), id: z.string().min(1) }),
]);

/** POST — send a preview to yourself, send/continue today's digest, or delete a subscriber. */
export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;
  if (guard.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const body = parsed.data;

  try {
    if (body.action === "send-test") {
      const r = await sendDigestPreview(guard.email);
      return NextResponse.json({ ok: r.sent, message: r.reason }, { status: r.sent ? 200 : 400 });
    }
    if (body.action === "send-now") {
      const r = await runDailyDigest({ budgetMs: 45_000 });
      const message =
        r.status === "SKIPPED"
          ? "Nothing new was published since the last digest, so today's was skipped."
          : r.status === "NO_SMTP"
          ? "SMTP isn't configured on this server, so nothing was sent."
          : r.status === "SENT" && r.sentThisRun === 0
          ? "Today's digest has already gone to everyone."
          : r.remaining > 0
          ? `Sent ${r.sentThisRun}. ${r.remaining} still to go — click again to continue.`
          : `Sent to ${r.sentThisRun} subscriber${r.sentThisRun === 1 ? "" : "s"}.${r.failedThisRun ? ` ${r.failedThisRun} failed and will be retried.` : ""}`;
      return NextResponse.json({ ok: true, message, result: r });
    }
    await prisma.subscriber.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true, message: "Subscriber removed." });
  } catch (err) {
    console.error("[newsletter] admin action failed:", err);
    return NextResponse.json({ error: "Something went wrong. Check the server logs." }, { status: 500 });
  }
}
