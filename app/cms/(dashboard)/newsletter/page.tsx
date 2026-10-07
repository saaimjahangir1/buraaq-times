"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Send, Eye, Download, Trash2, Loader2, Search, Users, Clock, MailX, AlertTriangle } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

interface Issue {
  id: string;
  date: string;
  subject: string;
  status: "SENDING" | "SENT" | "SKIPPED";
  sentCount: number;
  failedCount: number;
  stories: number;
}
interface Sub {
  id: string;
  email: string;
  status: "PENDING" | "ACTIVE" | "UNSUBSCRIBED";
  createdAt: string;
  confirmedAt: string | null;
  lastSentAt: string | null;
}
interface Data {
  stats: { active: number; pending: number; unsubscribed: number };
  issues: Issue[];
  subscribers: Sub[];
  cronConfigured: boolean;
}

const FILTERS = ["ALL", "ACTIVE", "PENDING", "UNSUBSCRIBED"] as const;

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function NewsletterAdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<null | "send-test" | "send-now" | string>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("status", filter);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/cms/newsletter?${params}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Couldn't load the newsletter.");
      return;
    }
    setError(null);
    setData(json);
  }, [filter, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const act = async (action: "send-test" | "send-now" | "remove", id?: string) => {
    if (action === "send-now" && !confirm("Send today's digest to all confirmed subscribers now?")) return;
    if (action === "remove" && !confirm("Delete this subscriber permanently?")) return;
    setBusy(id ?? action);
    setNotice(null);
    try {
      const res = await cmsFetch("/api/cms/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(id ? { action, id } : { action }),
      });
      const json = await res.json().catch(() => ({}));
      setNotice({ ok: res.ok, text: json.message || json.error || (res.ok ? "Done." : "That didn't work.") });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const stats = data?.stats;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Newsletter</h1>
          <p className="mt-1 text-sm text-white/50">
            The daily briefing goes out automatically around 6:30–7:30 am (Pakistan time) on days with new stories.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => act("send-test")}
            disabled={busy !== null}
            className="focus-ring flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
          >
            {busy === "send-test" ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Email me a preview
          </button>
          <button
            onClick={() => act("send-now")}
            disabled={busy !== null}
            className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-4 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
          >
            {busy === "send-now" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send today&apos;s now
          </button>
        </div>
      </div>

      {notice && (
        <p className={`mt-4 rounded-xl px-4 py-2.5 text-sm ${notice.ok ? "bg-signal/10 text-signal" : "bg-red-500/10 text-red-300"}`}>
          {notice.text}
        </p>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}
      {data && !data.cronConfigured && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Automatic sending is off on this server: CRON_SECRET isn&apos;t set. (Expected on the VPS — the daily send
          runs on Vercel.)
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Confirmed subscribers", value: stats?.active, icon: <Users size={16} /> },
          { label: "Waiting to confirm", value: stats?.pending, icon: <Clock size={16} /> },
          { label: "Unsubscribed", value: stats?.unsubscribed, icon: <MailX size={16} /> },
        ].map((s) => (
          <div key={s.label} className="glass rounded-glass p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal/10 text-signal">{s.icon}</span>
            <p className="mt-2 font-display text-2xl font-bold text-white">{s.value ?? "—"}</p>
            <p className="text-xs text-white/50">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Mail size={17} className="text-signal" /> Recent digests
        </h2>
        <div className="glass divide-y divide-white/5 rounded-glass">
          {!data && <p className="px-4 py-4 text-sm text-white/40">Loading…</p>}
          {data && data.issues.length === 0 && (
            <p className="px-4 py-4 text-sm text-white/40">No digests yet — the first goes out the morning after you publish.</p>
          )}
          {data?.issues.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span className="w-24 shrink-0 font-mono text-xs text-white/50">{i.date}</span>
              <span className="min-w-0 flex-1 truncate text-white/80">{i.status === "SKIPPED" ? "Nothing new — skipped" : i.subject}</span>
              {i.status !== "SKIPPED" && (
                <span className="text-xs text-white/40">
                  {i.stories} {i.stories === 1 ? "story" : "stories"} · sent {i.sentCount}
                  {i.failedCount ? ` · ${i.failedCount} failed` : ""}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  i.status === "SENT"
                    ? "bg-signal/20 text-signal"
                    : i.status === "SENDING"
                    ? "bg-amber-400/15 text-amber-300"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {i.status === "SENDING" ? "in progress" : i.status.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Users size={17} className="text-signal" /> Subscribers
          </h2>
          <a
            href="/api/cms/newsletter?format=csv"
            className="focus-ring flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
          >
            <Download size={14} /> Export confirmed (CSV)
          </a>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
            <Search size={15} className="text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email…"
              className="bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                  filter === f ? "bg-signal text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="glass divide-y divide-white/5 rounded-glass">
          {data && data.subscribers.length === 0 && <p className="px-4 py-4 text-sm text-white/40">No subscribers here yet.</p>}
          {data?.subscribers.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-white/85">{s.email}</span>
              <span className="text-xs text-white/40">
                joined {fmt(s.createdAt)}
                {s.lastSentAt ? ` · last email ${fmt(s.lastSentAt)}` : ""}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  s.status === "ACTIVE"
                    ? "bg-signal/20 text-signal"
                    : s.status === "PENDING"
                    ? "bg-amber-400/15 text-amber-300"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {s.status === "ACTIVE" ? "confirmed" : s.status.toLowerCase()}
              </span>
              <button
                onClick={() => act("remove", s.id)}
                disabled={busy !== null}
                aria-label={`Delete ${s.email}`}
                className="focus-ring rounded-lg p-1.5 text-white/40 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
              >
                {busy === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/30">Showing up to 300. Use the CSV export for the full list.</p>
      </section>
    </div>
  );
}
