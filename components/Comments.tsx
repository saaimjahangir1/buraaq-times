"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Flag,
  Link2,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { CommentView } from "@/lib/types";

// The reader comment section, laid out as a conversation: avatar, name and
// time, the comment, then 👍 / 👎 / Reply. Replies sit under their comment on
// a thread line. New comments and replies wait for moderation (shown only to
// the person who wrote them until approved).

type Sort = "recent" | "liked" | "oldest";
const PAGE = 10;
const IDENTITY_KEY = "bt_comment_identity";

/* ---------- small helpers ---------- */

const AVATAR_COLOURS = ["#F6A700", "#3B82F6", "#10B981", "#EC4899", "#8B5CF6", "#EF4444", "#14B8A6", "#F97316"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function colourFor(name: string) {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colour = colourFor(name || "?");
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 select-none items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: `${colour}26`, color: colour, boxShadow: `inset 0 0 0 1.5px ${colour}55` }}
    >
      {initials(name)}
    </span>
  );
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${plural(m, "minute")} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${plural(h, "hour")} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${plural(d, "day")} ago`;
  if (d < 30) return `${plural(Math.round(d / 7), "week")} ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" }).format(new Date(iso));
}

/** "2 hours ago" — rendered as a fixed date first so server and browser agree, then kept fresh. */
function TimeAgo({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const exact = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(iso));
  return (
    <time dateTime={iso} title={exact} className="text-xs text-ink/45 dark:text-white/40">
      {now === null ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" }).format(new Date(iso)) : ago(iso, now)}
    </time>
  );
}

/* ---------- the composer (new comment or reply) ---------- */

type Identity = { name: string; email: string };

function Composer({
  identity,
  setIdentity,
  onSubmit,
  replyingTo,
  onCancel,
  autoFocus,
}: {
  identity: Identity;
  setIdentity: (i: Identity) => void;
  onSubmit: (text: string) => Promise<string | null>; // returns an error message, or null
  replyingTo?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(Boolean(replyingTo));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) area.current?.focus();
  }, [autoFocus]);

  // Grow with the text.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity.name.trim() || !identity.email.trim()) return setError("Add your name and email so we can post this.");
    if (text.trim().length < 2) return setError("Write a little more first.");
    setBusy(true);
    setError(null);
    const problem = await onSubmit(text.trim());
    setBusy(false);
    if (problem) return setError(problem);
    setText("");
    if (!replyingTo) setOpen(false);
  };

  const field =
    "w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-signal/60 focus:ring-2 focus:ring-signal/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/35";

  return (
    <form onSubmit={submit} className="flex gap-3">
      <Avatar name={identity.name || "?"} size={replyingTo ? 30 : 36} />
      <div className="min-w-0 flex-1 space-y-2">
        {replyingTo ? (
          <p className="text-xs text-ink/50 dark:text-white/45">
            Replying to <span className="font-semibold text-signal">@{replyingTo}</span>
          </p>
        ) : null}
        <textarea
          ref={area}
          rows={replyingTo ? 2 : 1}
          value={text}
          maxLength={2000}
          onFocus={() => setOpen(true)}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyingTo ? `Reply to ${replyingTo}…` : "Join the conversation…"}
          aria-label={replyingTo ? `Reply to ${replyingTo}` : "Write a comment"}
          className={`${field} resize-none leading-relaxed`}
        />
        {open ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={identity.name}
                onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
                placeholder="Your name"
                aria-label="Your name"
                maxLength={60}
                autoComplete="name"
                className={field}
              />
              <input
                type="email"
                value={identity.email}
                onChange={(e) => setIdentity({ ...identity, email: e.target.value })}
                placeholder="Email (never shown)"
                aria-label="Email (never shown)"
                maxLength={254}
                autoComplete="email"
                className={field}
              />
            </div>
            {error ? (
              <p role="alert" className="text-xs text-red-500 dark:text-red-400">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink/40 dark:text-white/35">Comments appear after a quick review.</p>
              <div className="flex items-center gap-2">
                {onCancel || text ? (
                  <button
                    type="button"
                    onClick={() => {
                      setText("");
                      setError(null);
                      if (onCancel) onCancel();
                      else setOpen(false);
                    }}
                    className="focus-ring rounded-full px-3 py-1.5 text-xs font-semibold text-ink/60 hover:text-ink dark:text-white/55 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-60 dark:text-black"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {replyingTo ? "Reply" : "Post"}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </form>
  );
}

/* ---------- one comment ---------- */

function CommentMenu({ id, canReport, onReport }: { id: string; canReport: boolean; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2000);
  };
  return (
    // Inline position: the glass classes set position: relative and would win over a utility class.
    <div ref={wrap} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="More options"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="focus-ring rounded-full p-1 text-ink/40 transition hover:bg-black/5 hover:text-ink dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <MoreHorizontal size={16} />
      </button>
      {note ? <span className="absolute right-7 top-0.5 whitespace-nowrap text-[11px] text-signal">{note}</span> : null}
      {open ? (
        <div role="menu" className="absolute right-0 top-7 z-20 w-40 overflow-hidden rounded-xl border border-black/10 bg-paper py-1 text-sm shadow-xl dark:border-white/10 dark:bg-charcoal">
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              try {
                await navigator.clipboard.writeText(`${location.origin}${location.pathname}#comment-${id}`);
                flash("Link copied");
              } catch {
                flash("Couldn't copy");
              }
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-ink/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
          >
            <Link2 size={14} /> Copy link
          </button>
          {canReport ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onReport();
                flash("Reported — thanks");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              <Flag size={14} /> Report
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CommentRow({
  c,
  isReply,
  onVote,
  onReport,
  onReply,
  children,
}: {
  c: CommentView;
  isReply?: boolean;
  onVote: (c: CommentView, v: "LIKE" | "DISLIKE") => void;
  onReport: (c: CommentView) => void;
  onReply: (c: CommentView) => void;
  children?: React.ReactNode;
}) {
  const vote = (v: "LIKE" | "DISLIKE", Icon: typeof ThumbsUp, count: number, label: string) => {
    const active = c.myVote === v;
    return (
      <button
        type="button"
        disabled={c.pending}
        aria-pressed={active}
        aria-label={`${label} (${count})`}
        onClick={() => onVote(c, v)}
        className={`focus-ring flex items-center gap-1 rounded-full px-1.5 py-1 text-xs font-semibold transition disabled:opacity-40 ${
          active ? "text-signal" : "text-ink/50 hover:text-ink dark:text-white/45 dark:hover:text-white"
        }`}
      >
        <Icon size={15} fill={active ? "currentColor" : "none"} />
        {count > 0 ? count : null}
      </button>
    );
  };
  return (
    <div id={`comment-${c.id}`} className="scroll-mt-28">
      <div className="flex gap-3">
        <Avatar name={c.name} size={isReply ? 30 : 36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-semibold text-ink dark:text-white">{c.name}</span>
              {c.pending ? (
                <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal">Awaiting approval</span>
              ) : (
                <TimeAgo iso={c.createdAt} />
              )}
            </div>
            {!c.pending ? <CommentMenu id={c.id} canReport onReport={() => onReport(c)} /> : null}
          </div>
          <p className="mt-1 whitespace-pre-line break-words text-[0.94rem] leading-relaxed text-ink/80 dark:text-white/75">
            {c.replyToName && isReply ? <span className="mr-1 font-semibold text-signal">@{c.replyToName}</span> : null}
            {c.text}
          </p>
          {!c.pending ? (
            <div className="-ml-1.5 mt-1 flex flex-wrap items-center gap-1">
              {vote("LIKE", ThumbsUp, c.likes, "Like")}
              {vote("DISLIKE", ThumbsDown, c.dislikes, "Dislike")}
              <button
                type="button"
                onClick={() => onReply(c)}
                className="focus-ring rounded-full px-2 py-1 text-xs font-semibold text-ink/55 transition hover:text-signal dark:text-white/50"
              >
                Reply
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------- the section ---------- */

export default function Comments({
  type,
  slug,
  initial,
}: {
  type: "news" | "article";
  slug: string;
  initial: CommentView[];
}) {
  const [threads, setThreads] = useState<CommentView[]>(initial);
  const [sort, setSort] = useState<Sort>("recent");
  const [shown, setShown] = useState(PAGE);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<{ threadId: string; comment: CommentView } | null>(null);
  const [identity, setIdentityState] = useState<Identity>({ name: "", email: "" });
  const [error, setError] = useState<string | null>(null);

  // Remember name and email in this browser, so they're filled in next time.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null");
      if (saved && typeof saved.name === "string" && typeof saved.email === "string") setIdentityState(saved);
    } catch {
      /* blocked or empty storage */
    }
  }, []);
  const setIdentity = (i: Identity) => {
    setIdentityState(i);
    try {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(i));
    } catch {
      /* ignore */
    }
  };

  // Opened from a "Copy link" address: show and highlight that comment.
  useEffect(() => {
    const m = location.hash.match(/^#comment-(.+)$/);
    if (!m) return;
    const id = m[1];
    const idx = initial.findIndex((t) => t.id === id || t.replies.some((r) => r.id === id));
    if (idx >= PAGE) setShown(idx + 1);
    setTimeout(() => {
      const el = document.getElementById(`comment-${id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("rounded-xl", "ring-2", "ring-signal/50", "ring-offset-4", "ring-offset-transparent");
      setTimeout(() => el.classList.remove("ring-2", "ring-signal/50"), 2500);
    }, 300);
  }, [initial]);

  const ordered = useMemo(() => {
    const pending = threads.filter((t) => t.pending);
    const rest = threads.filter((t) => !t.pending);
    const by = {
      recent: (a: CommentView, b: CommentView) => b.createdAt.localeCompare(a.createdAt),
      oldest: (a: CommentView, b: CommentView) => a.createdAt.localeCompare(b.createdAt),
      liked: (a: CommentView, b: CommentView) => b.likes - b.dislikes - (a.likes - a.dislikes) || b.createdAt.localeCompare(a.createdAt),
    }[sort];
    return [...pending, ...rest.sort(by)];
  }, [threads, sort]);

  // Published comments and replies (not the visitor's own ones still waiting for review).
  const total = threads.filter((t) => !t.pending).reduce((n, t) => n + 1 + t.replies.filter((r) => !r.pending).length, 0);

  // Update one comment (top-level or reply) wherever it is.
  const patch = (id: string, change: Partial<CommentView>) =>
    setThreads((list) =>
      list.map((t) => (t.id === id ? { ...t, ...change } : { ...t, replies: t.replies.map((r) => (r.id === id ? { ...r, ...change } : r)) }))
    );

  const post = async (text: string, parent?: CommentView): Promise<string | null> => {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, slug, authorName: identity.name, authorEmail: identity.email, body: text, parentId: parent?.id ?? null }),
      });
      const data = (await res.json().catch(() => ({}))) as { comment?: CommentView; parentId?: string | null; error?: string };
      if (!res.ok || !data.comment) return data.error || "Couldn't post that — please try again.";
      const created = data.comment;
      if (data.parentId) {
        setThreads((list) => list.map((t) => (t.id === data.parentId ? { ...t, replies: [...t.replies, created] } : t)));
        setCollapsed((c) => ({ ...c, [data.parentId as string]: false }));
        setReplyTo(null);
      } else {
        setThreads((list) => [created, ...list]);
      }
      return null;
    } catch {
      return "Couldn't reach the server. Check your connection and try again.";
    }
  };

  const vote = async (c: CommentView, v: "LIKE" | "DISLIKE") => {
    // Show it straight away; the server's answer then sets the real numbers.
    const undo = { likes: c.likes, dislikes: c.dislikes, myVote: c.myVote };
    const next = c.myVote === v ? null : v;
    patch(c.id, {
      myVote: next,
      likes: c.likes + (next === "LIKE" ? 1 : 0) - (c.myVote === "LIKE" ? 1 : 0),
      dislikes: c.dislikes + (next === "DISLIKE" ? 1 : 0) - (c.myVote === "DISLIKE" ? 1 : 0),
    });
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(c.id)}/react`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reaction: v }),
      });
      const data = (await res.json().catch(() => ({}))) as { likes?: number; dislikes?: number; myVote?: "LIKE" | "DISLIKE" | null; error?: string };
      if (!res.ok || data.likes === undefined) throw new Error(data.error || "Couldn't save your vote.");
      patch(c.id, { likes: data.likes, dislikes: data.dislikes ?? 0, myVote: data.myVote ?? null });
    } catch (e) {
      patch(c.id, undo);
      setError(e instanceof Error ? e.message : "Couldn't save your vote.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const report = (c: CommentView) => {
    fetch(`/api/comments/${encodeURIComponent(c.id)}/react`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reaction: "REPORT" }),
    }).catch(() => {});
  };

  const visible = ordered.slice(0, shown);

  return (
    <section aria-labelledby="comments-heading" className="glass rounded-glass p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="comments-heading" className="flex items-center gap-2 font-display text-lg font-bold text-ink dark:text-white">
          <MessageCircle size={18} /> Comments
          <span className="rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-white dark:text-black">{total}</span>
        </h2>
        {threads.length > 1 ? (
          <label className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink/70 dark:border-white/10 dark:text-white/65">
            <ArrowUpDown size={13} />
            <span className="sr-only">Sort comments</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="cursor-pointer bg-transparent outline-none [&>option]:text-ink"
            >
              <option value="recent">Most recent</option>
              <option value="liked">Most liked</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        ) : null}
      </div>

      <Composer identity={identity} setIdentity={setIdentity} onSubmit={(t) => post(t)} />

      {error ? (
        <p role="alert" className="mt-3 text-xs text-red-500 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-6 border-t border-black/5 pt-6 dark:border-white/5">
        {visible.map((t) => {
          const isCollapsed = collapsed[t.id] ?? t.replies.length > 3;
          const replying = replyTo?.threadId === t.id;
          return (
            <CommentRow key={t.id} c={t} onVote={vote} onReport={report} onReply={(c) => setReplyTo({ threadId: t.id, comment: c })}>
              {t.replies.length ? (
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsed((c) => ({ ...c, [t.id]: !isCollapsed }))}
                  className="focus-ring -ml-1.5 mt-0.5 flex items-center gap-1 rounded-full px-1.5 py-1 text-xs font-semibold text-signal"
                >
                  {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  {isCollapsed ? (t.replies.length === 1 ? "Show 1 reply" : `Show ${t.replies.length} replies`) : "Hide replies"}
                </button>
              ) : null}

              {(!isCollapsed && t.replies.length) || replying ? (
                // Thread line from the comment down through its replies.
                <div className="mt-3 space-y-4 border-l-2 border-black/[0.07] pl-4 dark:border-white/10 sm:pl-5">
                  {!isCollapsed
                    ? t.replies.map((r) => (
                        <CommentRow key={r.id} c={r} isReply onVote={vote} onReport={report} onReply={(c) => setReplyTo({ threadId: t.id, comment: c })} />
                      ))
                    : null}
                  {replying && replyTo ? (
                    <Composer
                      key={replyTo.comment.id}
                      identity={identity}
                      setIdentity={setIdentity}
                      replyingTo={replyTo.comment.name}
                      autoFocus
                      onCancel={() => setReplyTo(null)}
                      onSubmit={(text) => post(text, replyTo.comment)}
                    />
                  ) : null}
                </div>
              ) : null}
            </CommentRow>
          );
        })}

        {threads.length === 0 ? (
          <div className="py-6 text-center">
            <MessageCircle size={28} className="mx-auto text-ink/20 dark:text-white/20" />
            <p className="mt-2 text-sm font-semibold text-ink/70 dark:text-white/70">No comments yet</p>
            <p className="text-xs text-ink/45 dark:text-white/40">Start the conversation — what did you think?</p>
          </div>
        ) : null}

        {ordered.length > shown ? (
          <button
            type="button"
            onClick={() => setShown((s) => s + PAGE)}
            className="focus-ring w-full rounded-full border border-black/10 py-2 text-sm font-semibold text-ink/70 transition hover:border-signal hover:text-signal dark:border-white/10 dark:text-white/65"
          >
            Show more comments ({ordered.length - shown})
          </button>
        ) : null}
      </div>
    </section>
  );
}
