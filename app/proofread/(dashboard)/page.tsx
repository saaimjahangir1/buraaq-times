import Link from "next/link";
import NextImage from "next/image";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, Inbox, Lock, SpellCheck, ArrowRight, XCircle, CalendarClock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseStaleClaims } from "@/lib/proofread";
import { parseStoredFields } from "@/lib/post-fields";
import { claimExpiresAt, hoursLeft, timeAgo, typeLabel, wordCount } from "@/lib/proofread-policy";
import QueueAction from "@/components/proofread/QueueAction";

export const dynamic = "force-dynamic";

const include = {
  post: { select: { type: true, slug: true, status: true, category: { select: { name: true } } } },
  submittedBy: { select: { name: true } },
  claimedBy: { select: { id: true, name: true } },
} as const;

type QueueItem = Awaited<ReturnType<typeof loadOpen>>[number];

function loadOpen() {
  return prisma.postReview.findMany({
    where: { status: { in: ["PENDING", "CLAIMED"] } },
    orderBy: { createdAt: "asc" },
    include,
  });
}

function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "signal" | "amber" | "cyan" }) {
  const tones = {
    plain: "bg-white/10 text-white/60",
    signal: "bg-signal/15 text-signal",
    amber: "bg-amber-400/15 text-amber-300",
    cyan: "bg-cyan/15 text-cyan",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

function ItemCard({ item, right, now }: { item: QueueItem; right: React.ReactNode; now: Date }) {
  const fields = parseStoredFields(item.payload);
  const image = fields.featuredImageUrl;
  const words = wordCount(item.bodyHtml);
  const waitingHours = (now.getTime() - item.createdAt.getTime()) / 3_600_000;

  return (
    <div className="glass flex flex-col gap-4 rounded-glass p-4 sm:flex-row sm:items-center">
      {image ? (
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
          <NextImage src={image} alt="" fill unoptimized className="object-cover" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="signal">{typeLabel(item.post.type)}</Chip>
          {item.post.category && <Chip>{item.post.category.name}</Chip>}
          {item.isUpdate && <Chip tone="cyan">Edit to live post</Chip>}
          {item.targetStatus === "SCHEDULED" && item.scheduledAt && (
            <Chip tone="amber">
              <CalendarClock size={11} /> Scheduled
            </Chip>
          )}
        </div>
        <p className="mt-2 line-clamp-2 font-display text-lg font-bold leading-snug text-white">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-white/55">{item.summary}</p>
        <p className="mt-2 text-xs text-white/40">
          By {item.submittedBy.name} · submitted{" "}
          <span className={item.status === "PENDING" && waitingHours > 12 ? "font-semibold text-amber-300" : ""}>
            {timeAgo(item.createdAt, now)}
          </span>{" "}
          · {words.toLocaleString()} words · {Math.max(1, Math.round(words / 200))} min read
        </p>
      </div>
      <div className="flex shrink-0 sm:justify-end">{right}</div>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
        {icon} {title}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60">{count}</span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default async function ProofreadQueuePage({
  searchParams,
}: {
  searchParams: { done?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/proofread/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, name: true, role: true } });
  if (!me) redirect("/proofread/login");
  const isAdmin = me.role === "ADMIN";

  await releaseStaleClaims();
  const now = new Date();
  const [open, finished] = await Promise.all([
    loadOpen(),
    prisma.postReview.findMany({
      where: {
        status: { in: ["APPROVED", "REJECTED"] },
        ...(isAdmin ? {} : { claimedById: me.id }),
      },
      orderBy: { decidedAt: "desc" },
      take: 10,
      include,
    }),
  ]);

  const mine = open.filter((r) => r.status === "CLAIMED" && r.claimedById === me.id);
  const waiting = open.filter((r) => r.status === "PENDING");
  const others = open.filter((r) => r.status === "CLAIMED" && r.claimedById !== me.id);

  const flash =
    searchParams.done === "approved"
      ? { tone: "signal", text: "Approved — it's live now, and the editor has been told." }
      : searchParams.done === "scheduled"
      ? { tone: "signal", text: "Approved — it will go live at its scheduled time, and the editor has been told." }
      : searchParams.done === "rejected"
      ? { tone: "red", text: "Returned to the editor with your note." }
      : searchParams.done === "released"
      ? { tone: "plain", text: "Released — it's back in the queue for anyone to pick up." }
      : null;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
        {waiting.length === 0 && mine.length === 0 ? "All caught up" : "Proofreading queue"}
      </h1>
      <p className="mt-1 text-sm text-white/50">
        Claim a piece to lock it for yourself, correct it, then approve it to publish or return it to the editor.
      </p>

      {flash && (
        <p
          className={`mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            flash.tone === "signal"
              ? "bg-signal/10 text-signal"
              : flash.tone === "red"
              ? "bg-red-500/10 text-red-300"
              : "bg-white/5 text-white/70"
          }`}
        >
          <CheckCircle2 size={16} className="shrink-0" /> {flash.text}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Waiting", value: waiting.length, icon: <Inbox size={16} /> },
          { label: "On your desk", value: mine.length, icon: <SpellCheck size={16} /> },
          { label: "With others", value: others.length, icon: <Lock size={16} /> },
          {
            label: isAdmin ? "Recently decided" : "You finished",
            value: finished.length,
            icon: <CheckCircle2 size={16} />,
          },
        ].map((s) => (
          <div key={s.label} className="glass rounded-glass p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal/10 text-signal">{s.icon}</span>
            <p className="mt-2 font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/50">{s.label}</p>
          </div>
        ))}
      </div>

      {mine.length > 0 && (
        <Section icon={<SpellCheck size={18} className="text-signal" />} title="On your desk" count={mine.length}>
          {mine.map((r) => (
            <ItemCard
              key={r.id}
              item={r}
              now={now}
              right={
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <Link
                    href={`/proofread/review/${r.id}`}
                    className="focus-ring flex items-center justify-center gap-1.5 rounded-full bg-signal px-4 py-2 text-sm font-semibold text-white shadow-glow"
                  >
                    Continue <ArrowRight size={14} />
                  </Link>
                  <span className="text-center text-[11px] text-white/40 sm:text-right">
                    Claim: {hoursLeft(claimExpiresAt(r.lastActivityAt), now)}
                  </span>
                </div>
              }
            />
          ))}
        </Section>
      )}

      <Section icon={<Inbox size={18} className="text-signal" />} title="Waiting for a proofreader" count={waiting.length}>
        {waiting.length === 0 ? (
          <div className="glass rounded-glass p-6 text-center text-sm text-white/50">
            Nothing is waiting. You&apos;ll get an email as soon as an editor submits something.
          </div>
        ) : (
          waiting.map((r) => (
            <ItemCard key={r.id} item={r} now={now} right={<QueueAction reviewId={r.id} action="claim" />} />
          ))
        )}
      </Section>

      {others.length > 0 && (
        <Section icon={<Lock size={18} className="text-cyan" />} title="Being proofread by others" count={others.length}>
          {others.map((r) => (
            <div key={r.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-glass p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone="signal">{typeLabel(r.post.type)}</Chip>
                  {r.isUpdate && <Chip tone="cyan">Edit to live post</Chip>}
                </div>
                <p className="mt-1.5 truncate font-medium text-white/85">{r.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/45">
                  <Lock size={12} className="text-cyan" /> {r.claimedBy?.name ?? "Someone"} has it ·{" "}
                  {r.claimedAt ? `since ${timeAgo(r.claimedAt, now)}` : ""} · releases automatically in{" "}
                  {hoursLeft(claimExpiresAt(r.lastActivityAt), now).replace(" left", "")}
                </p>
              </div>
              {isAdmin && (
                <QueueAction reviewId={r.id} action="release" variant="ghost" label="Release (admin)" />
              )}
            </div>
          ))}
        </Section>
      )}

      {finished.length > 0 && (
        <Section
          icon={<Clock size={18} className="text-white/50" />}
          title={isAdmin ? "Recently decided" : "Recently finished by you"}
          count={finished.length}
        >
          <div className="glass divide-y divide-white/5 rounded-glass">
            {finished.map((r) => (
              <Link
                key={r.id}
                href={`/proofread/review/${r.id}`}
                className="focus-ring flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-white/[0.03]"
              >
                {r.status === "APPROVED" ? (
                  <CheckCircle2 size={16} className="shrink-0 text-signal" />
                ) : (
                  <XCircle size={16} className="shrink-0 text-red-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-white/80">{r.title}</span>
                {isAdmin && r.claimedBy && (
                  <span className="hidden shrink-0 text-xs text-white/40 sm:block">{r.claimedBy.name}</span>
                )}
                <span className="shrink-0 text-xs text-white/40">{r.decidedAt ? timeAgo(r.decidedAt, now) : ""}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
