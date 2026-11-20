import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  FolderTree,
  MessageSquare,
  Plus,
  SpellCheck,
  Undo2,
  Users,
} from "lucide-react";

// The CMS dashboard, laid out like a frosted-glass control room: greeting and
// headline numbers, a status bar, then cards. Pure display — the page
// (app/cms/(dashboard)/page.tsx) gathers the numbers.

export type DashboardData = {
  firstName: string;
  isAdmin: boolean;
  canNews: boolean;
  canArticle: boolean;
  status: { published: number; inReview: number; drafts: number; scheduled: number };
  totals: { published: number; views: number; comments: number };
  week: { label: string; count: number; today: boolean }[];
  weekTotal: number;
  lastWeekTotal: number;
  topStories: { title: string; views: number; href: string }[];
  queue: { count: number; claimed: number; oldestMinutes: number | null };
  passRate: { approved: number; returned: number; waiting: number };
  todos: { key: string; label: string; detail: string; href: string; count: number }[];
  calendar: {
    monthLabel: string;
    days: { key: string; dow: string; date: number; today: boolean; items: { title: string; time: string; live: boolean; href: string }[] }[];
  };
  categories: { name: string; count: number }[];
  recent: { id: string; title: string; author: string; status: string; href: string }[];
};

const card =
  "rounded-[28px] border border-white/70 bg-white/45 p-5 shadow-[0_18px_44px_-24px_rgba(70,52,25,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)]";
const soft = "text-ink/55 dark:text-white/50";
const strong = "text-ink dark:text-white";

export const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1_000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

function CardTitle({ children, href, right }: { children: React.ReactNode; href?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <p className={`text-[15px] font-semibold ${strong}`}>{children}</p>
      {right}
      {href ? (
        <Link href={href} aria-label="Open" className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 text-ink/70 transition hover:bg-ink hover:text-white dark:border-white/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white dark:hover:text-ink">
          <ArrowUpRight size={15} />
        </Link>
      ) : null}
    </div>
  );
}

function Dial({ minutes }: { minutes: number | null }) {
  // A full ring = 4 hours, when the desk sends its "still waiting" reminder.
  const pct = minutes === null ? 0 : Math.min(1, minutes / 240);
  const r = 46;
  const c = 2 * Math.PI * r;
  const label =
    minutes === null ? "—" : minutes < 60 ? `${minutes}m` : minutes < 24 * 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m` : `${Math.floor(minutes / 1440)}d`;
  return (
    <div className="relative mx-auto h-[132px] w-[132px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-black/[0.07] dark:stroke-white/10" />
        {Array.from({ length: 48 }).map((_, i) => {
          const a = (i / 48) * 2 * Math.PI;
          return <line key={i} x1={60 + 56 * Math.cos(a)} y1={60 + 56 * Math.sin(a)} x2={60 + 58.5 * Math.cos(a)} y2={60 + 58.5 * Math.sin(a)} strokeWidth="1" className="stroke-black/15 dark:stroke-white/15" />;
        })}
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" strokeLinecap="round" stroke="rgb(var(--accent))" strokeDasharray={`${c * pct} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[26px] font-light leading-none tracking-tight ${strong}`}>{label}</span>
        <span className={`mt-1 text-[11px] ${soft}`}>{minutes === null ? "queue is empty" : "oldest waiting"}</span>
      </div>
    </div>
  );
}

const statusChip = (s: string) =>
  s === "PUBLISHED"
    ? "bg-ink text-white dark:bg-white dark:text-ink"
    : s === "SCHEDULED"
    ? "bg-signal text-black"
    : s === "IN_REVIEW"
    ? "border border-signal/60 text-ink dark:text-white"
    : "bg-black/[0.06] text-ink/70 dark:bg-white/10 dark:text-white/70";

export default function DashboardView({ d }: { d: DashboardData }) {
  const s = d.status;
  const statusTotal = Math.max(1, s.published + s.inReview + s.drafts + s.scheduled);
  const segments = [
    { label: "Published", value: s.published, bar: "bg-ink dark:bg-white", text: "" },
    { label: "In review", value: s.inReview, bar: "bg-signal", text: "" },
    { label: "Drafts", value: s.drafts, bar: "cms-stripes border border-black/10 dark:border-white/15", text: "" },
    { label: "Scheduled", value: s.scheduled, bar: "border border-black/15 bg-white/50 dark:border-white/20 dark:bg-white/[0.06]", text: "" },
  ].filter((x) => x.value > 0);
  const weekMax = Math.max(1, ...d.week.map((w) => w.count));
  const topMax = Math.max(1, ...d.topStories.map((t) => t.views));
  const decided = d.passRate.approved + d.passRate.returned;
  const passPct = decided ? Math.round((d.passRate.approved / decided) * 100) : null;
  const todoDone = d.todos.filter((t) => t.count === 0).length;
  const trend = d.weekTotal - d.lastWeekTotal;
  const catMax = Math.max(1, ...d.categories.map((c) => c.count));

  return (
    <div className="space-y-5">
      {/* Greeting + headline numbers */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className={`cms-hero font-display text-[2.1rem] font-light leading-tight tracking-tight sm:text-[2.6rem] ${strong}`}>
            Welcome in, {d.firstName}
          </h1>
          <p className={`mt-1 text-sm ${soft}`}>Here&apos;s the newsroom at a glance.</p>
        </div>
        <div className="flex flex-col items-start gap-3 xl:items-end">
          <div className="flex flex-wrap gap-2">
            {d.canNews ? (
              <Link href="/cms/news/new" className="focus-ring flex items-center gap-2 rounded-full bg-signal py-1.5 pl-1.5 pr-4 text-sm font-semibold text-black shadow-md transition hover:brightness-105">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-signal">
                  <Plus size={15} />
                </span>
                New news
              </Link>
            ) : null}
            {d.canArticle ? (
              <Link href="/cms/articles/new" className="focus-ring flex items-center gap-2 rounded-full border border-white/70 bg-white/60 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink shadow-sm backdrop-blur-xl transition hover:bg-white/85 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white dark:bg-white dark:text-ink">
                  <Plus size={15} />
                </span>
                New article
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className={`text-[2.6rem] font-light leading-none tracking-tight ${strong}`}>{d.totals.published.toLocaleString("en-US")}</p>
              <p className={`mt-1 text-xs ${soft}`}>Published stories</p>
            </div>
            <div>
              <p className={`flex items-center gap-2 text-[2.6rem] font-light leading-none tracking-tight ${strong}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal text-black">
                  <MessageSquare size={14} />
                </span>
                {compact(d.totals.comments)}
              </p>
              <p className={`mt-1 text-xs ${soft}`}>Reader comments</p>
            </div>
            <div>
              <p className={`text-[2.6rem] font-light leading-none tracking-tight ${strong}`}>{compact(d.totals.views)}</p>
              <p className={`mt-1 text-xs ${soft}`}>Total views</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      {segments.length ? (
        <div className="flex gap-1.5" role="img" aria-label={segments.map((x) => `${x.label}: ${x.value}`).join(", ")}>
          {segments.map((x) => {
            const pct = Math.round((x.value / statusTotal) * 100);
            return (
              <div key={x.label} className="min-w-[88px]" style={{ flexGrow: Math.max(x.value, statusTotal * 0.08), flexBasis: 0 }}>
                <p className={`mb-1.5 truncate text-xs ${soft}`}>
                  {x.label} · {x.value}
                </p>
                <div className={`flex h-9 items-center rounded-full px-3 text-xs font-semibold ${x.bar} ${x.label === "Published" ? "text-white dark:text-ink" : x.label === "In review" ? "text-black" : strong}`}>
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* This week */}
        <section className={`${card} xl:col-span-3`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${soft}`}>Published this week</p>
              <p className={`mt-1 text-[1.9rem] font-light leading-none tracking-tight ${strong}`}>{d.weekTotal}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${trend >= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-600 dark:text-red-300"}`}>
              {trend >= 0 ? "+" : ""}
              {trend} vs last week
            </span>
          </div>
          <div className="mt-5 flex h-[118px] items-end justify-between gap-2">
            {d.week.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
                <span className={`text-[10px] font-semibold ${w.count ? strong : soft}`}>{w.count || ""}</span>
                <div
                  className={`w-full max-w-[26px] rounded-full ${w.today ? "bg-signal" : w.count ? "bg-ink/85 dark:bg-white/85" : "bg-black/[0.07] dark:bg-white/10"}`}
                  style={{ height: `${w.count ? 34 + (w.count / weekMax) * 52 : 22}px` }}
                  title={`${w.label}: ${w.count}`}
                />
                <span className={`text-[10px] ${w.today ? "font-bold text-ink dark:text-white" : soft}`}>{w.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Most read */}
        <section className={`${card} xl:col-span-3`}>
          <CardTitle href="/cms/analytics">Most read</CardTitle>
          {d.topStories.length ? (
            <>
              <p className={`text-[1.9rem] font-light leading-none tracking-tight ${strong}`}>
                {compact(d.topStories[0].views)} <span className={`text-xs font-normal ${soft}`}>views on the top story</span>
              </p>
              <div className="mt-4 flex h-[92px] items-end justify-between gap-3 px-1">
                {d.topStories.map((t, i) => (
                  <Link key={t.href + i} href={t.href} title={`${t.title} — ${t.views.toLocaleString("en-US")} views`} className="group relative flex flex-1 flex-col items-center justify-end">
                    {i === 0 ? (
                      <span className="absolute -top-6 whitespace-nowrap rounded-full bg-signal px-1.5 py-0.5 text-[10px] font-bold text-black">{compact(t.views)}</span>
                    ) : null}
                    <span className={`w-[5px] rounded-full transition group-hover:bg-signal ${i === 0 ? "bg-ink dark:bg-white" : "bg-ink/70 dark:bg-white/60"}`} style={{ height: `${Math.max(10, (t.views / topMax) * 84)}px` }} />
                  </Link>
                ))}
              </div>
              <p className={`mt-3 truncate text-xs ${soft}`}>
                Top: <span className={strong}>{d.topStories[0].title}</span>
              </p>
            </>
          ) : (
            <p className={`text-sm ${soft}`}>No published stories yet.</p>
          )}
        </section>

        {/* Proofreading dial */}
        <section className={`${card} xl:col-span-3`}>
          <CardTitle href="/proofread">Proofreading</CardTitle>
          <Dial minutes={d.queue.oldestMinutes} />
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <span className="rounded-full bg-ink px-2.5 py-1 font-semibold text-white dark:bg-white dark:text-ink">{d.queue.count} waiting</span>
            <span className="rounded-full border border-black/10 px-2.5 py-1 font-semibold text-ink/70 dark:border-white/15 dark:text-white/70">{d.queue.claimed} being checked</span>
          </div>
        </section>

        {/* Pass rate + to-do (tall column) */}
        <div className="flex flex-col gap-4 md:col-span-2 xl:col-span-3 xl:row-span-2">
          <section className={card}>
            <div className="flex items-start justify-between">
              <p className={`text-[15px] font-semibold ${strong}`}>Approved first time</p>
              <p className={`text-[1.9rem] font-light leading-none tracking-tight ${strong}`}>{passPct === null ? "—" : `${passPct}%`}</p>
            </div>
            <p className={`mt-1 text-xs ${soft}`}>Proofreading decisions, last 30 days</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-center text-[11px] font-semibold">
              <span className="flex-1 whitespace-nowrap rounded-full bg-signal px-2.5 py-1.5 text-black">{d.passRate.approved} approved</span>
              <span className="flex-1 whitespace-nowrap rounded-full bg-ink px-2.5 py-1.5 text-white dark:bg-white dark:text-ink">{d.passRate.returned} returned</span>
              <span className="flex-1 whitespace-nowrap rounded-full border border-black/10 px-2.5 py-1.5 text-ink/70 dark:border-white/15 dark:text-white/70">{d.passRate.waiting} waiting</span>
            </div>
          </section>

          <section className="flex-1 rounded-[28px] bg-[#1b1916] p-5 text-white shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] dark:bg-black/60 dark:ring-1 dark:ring-white/10">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold">To do</p>
              <span className="text-sm font-light text-white/60">
                {todoDone}/{d.todos.length}
              </span>
            </div>
            <ul className="space-y-1">
              {d.todos.map((t) => {
                const done = t.count === 0;
                const Icon = t.key === "comments" ? MessageSquare : t.key === "people" ? Users : t.key === "returned" ? Undo2 : t.key === "review" ? SpellCheck : FileText;
                return (
                  <li key={t.key}>
                    <Link href={t.href} className="focus-ring flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/[0.06]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80">
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${done ? "text-white/45 line-through decoration-white/30" : "text-white"}`}>{t.label}</span>
                        <span className="block truncate text-[11px] text-white/45">{t.detail}</span>
                      </span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-signal text-black" : "border border-white/25"}`}>
                        {done ? <Check size={13} strokeWidth={3} /> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Categories */}
        <section className={`${card} xl:col-span-3`}>
          <CardTitle href={d.isAdmin ? "/cms/categories" : undefined}>Top categories</CardTitle>
          {d.categories.length ? (
            <ul className="space-y-2.5">
              {d.categories.map((c, i) => (
                <li key={c.name} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${i === 0 ? "bg-signal text-black" : "bg-black/[0.06] text-ink/70 dark:bg-white/10 dark:text-white/70"}`}>
                    <FolderTree size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className={`truncate ${strong}`}>{c.name}</span>
                      <span className={`text-xs ${soft}`}>{c.count}</span>
                    </span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                      <span className="block h-full rounded-full bg-ink/70 dark:bg-white/60" style={{ width: `${(c.count / catMax) * 100}%` }} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm ${soft}`}>No stories in categories yet.</p>
          )}
        </section>

        {/* Week calendar */}
        <section className={`${card} md:col-span-2 xl:col-span-6`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className={`text-[15px] font-semibold ${strong}`}>This week&apos;s stories</p>
            <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs font-semibold text-ink/75 dark:border-white/10 dark:bg-white/10 dark:text-white/75">{d.calendar.monthLabel}</span>
          </div>
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
              {d.calendar.days.map((day) => (
                <div key={day.key} className={`min-h-[150px] rounded-2xl p-1.5 ${day.today ? "bg-signal/15 ring-1 ring-signal/50" : "bg-white/35 dark:bg-white/[0.03]"}`}>
                  <p className={`text-center text-[11px] ${soft}`}>{day.dow}</p>
                  <p className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm ${day.today ? "bg-signal font-bold text-black" : strong}`}>{day.date}</p>
                  <div className="mt-2 space-y-1">
                    {day.items.slice(0, 3).map((it, i) => (
                      <Link
                        key={i}
                        href={it.href}
                        title={`${it.title} — ${it.live ? "published" : "scheduled"} ${it.time}`}
                        className={`block rounded-xl px-2 py-1.5 text-[10.5px] leading-tight shadow-sm transition hover:brightness-110 ${
                          it.live ? "bg-ink text-white dark:bg-white dark:text-ink" : "border border-white/80 bg-white/85 text-ink dark:border-white/10 dark:bg-white/10 dark:text-white"
                        }`}
                      >
                        <span className="line-clamp-2 font-semibold">{it.title}</span>
                        <span className="opacity-60">{it.time}</span>
                      </Link>
                    ))}
                    {day.items.length > 3 ? <p className={`text-center text-[10px] ${soft}`}>+{day.items.length - 3} more</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className={`mt-3 flex items-center gap-4 text-[11px] ${soft}`}>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink dark:bg-white" /> Published
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-black/20 bg-white dark:border-white/30 dark:bg-white/20" /> Scheduled
            </span>
          </p>
        </section>

        {/* Recent activity */}
        <section className={`${card} md:col-span-2 xl:col-span-12`}>
          <CardTitle>Recent activity</CardTitle>
          {d.recent.length === 0 ? <p className={`text-sm ${soft}`}>Nothing here yet.</p> : null}
          <div className="grid gap-1 md:grid-cols-2">
            {d.recent.map((p) => (
              <Link key={p.id} href={p.href} className="focus-ring group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition hover:bg-white/60 dark:hover:bg-white/[0.06]">
                <span className={`min-w-0 flex-1 truncate ${strong}`}>{p.title}</span>
                <span className={`hidden shrink-0 text-xs sm:inline ${soft}`}>{p.author}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusChip(p.status)}`}>{p.status.replace("_", " ")}</span>
                <ChevronRight size={15} className={`shrink-0 transition group-hover:translate-x-0.5 ${soft}`} />
              </Link>
            ))}
          </div>
          <p className={`mt-2 flex items-center gap-1.5 text-[11px] ${soft}`}>
            <Eye size={12} /> Views count every reader who opens a story. <CheckCircle2 size={12} className="ml-2" /> Proofreading numbers include only stories you can see.
          </p>
        </section>
      </div>
    </div>
  );
}
