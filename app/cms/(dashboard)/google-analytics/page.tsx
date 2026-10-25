import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowDownRight, ArrowUpRight, ExternalLink, Globe, MonitorSmartphone, Radio, Share2, Settings2 } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { GaError, GaNotConfiguredError, GaSummary, RANGES, RangeDays, getGaSummary } from "@/lib/google-analytics";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
function duration(sec: number) {
  const s = Math.round(sec);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
function change(now: number, before: number) {
  if (!before) return null;
  return ((now - before) / before) * 100;
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-glass p-5">
      <p className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-white">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ label, value, now, before, percent }: { label: string; value: string; now: number; before: number; percent?: boolean }) {
  const c = percent ? (before ? (now - before) * 100 : null) : change(now, before);
  const up = (c ?? 0) >= 0;
  return (
    <div className="glass rounded-glass p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      {c !== null && Number.isFinite(c) ? (
        <p className={`mt-1 flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-signal" : "text-red-400"}`}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(c).toFixed(Math.abs(c) < 10 ? 1 : 0)}
          {percent ? " pts" : "%"} <span className="font-normal text-white/35"><span className="hidden sm:inline">vs previous period</span><span className="sm:hidden">vs before</span></span>
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-white/30">no earlier data</p>
      )}
    </div>
  );
}

function Bars({ rows, total, capitalize }: { rows: { name: string; value: number }[]; total?: number; capitalize?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-white/40">No data yet.</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sum = total ?? rows.reduce((a, r) => a + r.value, 0);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className={`truncate text-white/75 ${capitalize ? "capitalize" : ""}`}>{r.name}</span>
            <span className="shrink-0 text-white/40">
              {fmt(r.value)}
              {sum > 0 && <span className="ml-1.5 text-white/25">{Math.round((r.value / sum) * 100)}%</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-signal to-cyanDeep" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Daily visitors (filled area) and page views (line), plain SVG. */
function TrendChart({ daily }: { daily: GaSummary["daily"] }) {
  const W = 760;
  const H = 220;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const max = Math.max(4, ...daily.map((d) => Math.max(d.users, d.views)));
  const niceMax = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.l + (daily.length <= 1 ? 0 : (i / (daily.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const line = (key: "users" | "views") => daily.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const area = `${line("users")} L${x(daily.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));
  const labelEvery = Math.ceil(daily.length / 7);
  const label = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div>
      <div className="mb-3 flex gap-4 text-[11px] text-white/55">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-signal" /> Visitors
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded bg-cyan" /> Page views
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily visitors and page views">
        <defs>
          <linearGradient id="ga-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.35)">
              {fmt(t)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#ga-area)" />
        <path d={line("users")} fill="none" stroke="rgb(var(--accent))" strokeWidth="2" strokeLinejoin="round" />
        <path d={line("views")} fill="none" className="stroke-cyan" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" />
        {daily.map((d, i) => (
          <g key={d.date}>
            <circle cx={x(i)} cy={y(d.users)} r={daily.length > 40 ? 0 : 2.5} fill="rgb(var(--accent))" />
            <rect x={x(i) - (W - pad.l - pad.r) / daily.length / 2} y={pad.t} width={(W - pad.l - pad.r) / daily.length} height={H - pad.t - pad.b} fill="transparent">
              <title>{`${label(d.date)}: ${fmt(d.users)} visitors, ${fmt(d.views)} page views`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)">
                {label(d.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function SetupGuide({ problem }: { problem?: string }) {
  return (
    <div className="glass mt-6 rounded-glass p-6">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <Settings2 size={18} className="text-signal" /> {problem ? "Google Analytics needs attention" : "Connect Google Analytics"}
      </p>
      {problem ? (
        <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{problem}</p>
      ) : (
        <p className="mt-2 text-sm text-white/60">
          Visitor numbers from Google Analytics appear here once the site has these settings (in the VPS <code>.env</code> and
          in Vercel):
        </p>
      )}
      <ul className="mt-4 space-y-2 text-sm text-white/70">
        <li>
          <code className="text-signal">NEXT_PUBLIC_GA_MEASUREMENT_ID</code> — starts with <code>G-</code>; turns on tracking.
        </li>
        <li>
          <code className="text-signal">GA_PROPERTY_ID</code> — the property number (Admin → Property details).
        </li>
        <li>
          <code className="text-signal">GA_CLIENT_EMAIL</code> and <code className="text-signal">GA_PRIVATE_KEY</code> — from
          a Google Cloud service account&apos;s JSON key. Add that email to the property as a <strong>Viewer</strong>.
        </li>
      </ul>
    </div>
  );
}

export default async function GoogleAnalyticsPage({ searchParams }: { searchParams: { days?: string } }) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/cms");

  const days = (RANGES.find((r) => String(r) === searchParams.days) ?? 28) as RangeDays;
  let data: GaSummary | null = null;
  let problem: string | null = null;
  let notConfigured = false;
  try {
    data = await getGaSummary(days);
  } catch (e) {
    if (e instanceof GaNotConfiguredError) notConfigured = true;
    else problem = e instanceof GaError ? e.message : "Couldn't reach Google Analytics. Try again in a minute.";
    if (!(e instanceof GaNotConfiguredError) && !(e instanceof GaError)) console.error("[ga] page failed:", e);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
            <Activity size={22} className="text-signal" /> Google Analytics
          </h1>
          <p className="mt-1 text-sm text-white/50">Visitors to buraaqtimes.com — visible to admins only.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data?.realtimeUsers !== null && data?.realtimeUsers !== undefined && (
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal">
              <Radio size={13} className="animate-pulse" /> {fmt(data.realtimeUsers)} on the site now
            </span>
          )}
          <div className="flex rounded-full bg-white/5 p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/cms/google-analytics?days=${r}`}
                className={`focus-ring whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  r === days ? "bg-signal text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {r} days
              </Link>
            ))}
          </div>
        </div>
      </div>

      {notConfigured && <SetupGuide />}
      {problem && <SetupGuide problem={problem} />}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Visitors" value={fmt(data.totals.users)} now={data.totals.users} before={data.previous.users} />
            <Stat label="New visitors" value={fmt(data.totals.newUsers)} now={data.totals.newUsers} before={data.previous.newUsers} />
            <Stat label="Visits" value={fmt(data.totals.sessions)} now={data.totals.sessions} before={data.previous.sessions} />
            <Stat label="Page views" value={fmt(data.totals.views)} now={data.totals.views} before={data.previous.views} />
            <Stat
              label="Avg. time per visitor"
              value={duration(data.totals.avgEngagementSec)}
              now={data.totals.avgEngagementSec}
              before={data.previous.avgEngagementSec}
            />
            <Stat
              label="Engaged visits"
              value={`${Math.round(data.totals.engagementRate * 100)}%`}
              now={data.totals.engagementRate}
              before={data.previous.engagementRate}
              percent
            />
          </div>

          <div className="mt-4">
            <Card title={`Visitors over the last ${days} days`}>
              <TrendChart daily={data.daily} />
            </Card>
          </div>

          <div className="mt-4">
            <Card title="Most-read pages" icon={<Activity size={15} className="text-signal" />}>
              {data.topPages.length === 0 ? (
                <p className="text-sm text-white/40">No data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-white/35">
                        <th className="pb-2 font-medium">Page</th>
                        <th className="w-20 pb-2 text-right font-medium sm:w-24">Views</th>
                        <th className="w-20 pb-2 text-right font-medium sm:w-24">Visitors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topPages.map((p) => (
                        <tr key={p.path} className="border-t border-white/5">
                          <td className="py-2.5 pr-3">
                            <a
                              href={`${SITE_URL}${p.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-1.5 text-white/80 hover:text-white"
                            >
                              <span className="truncate">{p.title.replace(/\s*\|\s*Buraaq Times$/, "") || p.path}</span>
                              <ExternalLink size={12} className="shrink-0 opacity-0 transition group-hover:opacity-60" />
                            </a>
                            <span className="block truncate text-[11px] text-white/30">{p.path}</span>
                          </td>
                          <td className="py-2.5 text-right text-white/70">{fmt(p.views)}</td>
                          <td className="py-2.5 text-right text-white/45">{fmt(p.users)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card title="How visitors find us" icon={<Share2 size={15} className="text-signal" />}>
              <Bars rows={data.channels} />
            </Card>
            <Card title="Top sources" icon={<ExternalLink size={15} className="text-signal" />}>
              <Bars rows={data.sources} />
            </Card>
            <Card title="Countries" icon={<Globe size={15} className="text-signal" />}>
              <Bars rows={data.countries} />
            </Card>
            <Card title="Devices" icon={<MonitorSmartphone size={15} className="text-signal" />}>
              <Bars rows={data.devices} capitalize />
            </Card>
          </div>

          <p className="mt-6 text-xs text-white/30">
            From Google Analytics · refreshed every 5 minutes · last fetched{" "}
            {new Date(data.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })} PKT.
            New visits can take up to a day to appear in these totals; &ldquo;on the site now&rdquo; is live.
          </p>
        </>
      )}
    </div>
  );
}
