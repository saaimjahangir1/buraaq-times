"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, CheckCircle2, MessageSquare, AlertTriangle, UserCog, Info, X } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, React.ReactNode> = {
  PUBLISH_CONFIRMATION: <CheckCircle2 size={15} className="text-[rgb(var(--accent-ink))] dark:text-signal" />,
  COMMENT_ALERT: <MessageSquare size={15} className="text-cyan" />,
  SEO_ALERT: <AlertTriangle size={15} className="text-amber-700 dark:text-amber-400" />,
  ACCOUNT: <UserCog size={15} className="text-[rgb(var(--accent-ink))] dark:text-signal" />,
  DRAFT_REMINDER: <Info size={15} className="text-ink/60 dark:text-white/50" />,
  SYSTEM: <Info size={15} className="text-ink/60 dark:text-white/50" />,
  REVIEW: <AlertTriangle size={15} className="text-red-700 dark:text-red-400" />,
};

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const EDGE = 12; // gap kept between the panel and the screen edge
const MAX_W = 384;

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/cms/notifications");
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* keep the last list */
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  // The panel is drawn on top of the page (not inside the header, whose
  // frosted glass would trap it), lined up under the bell and kept on screen.
  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const width = Math.min(MAX_W, vw - EDGE * 2);
    // Right edge lines up with the bell's round button, but never runs off either side.
    let right = vw - r.right - 6;
    right = Math.max(EDGE, Math.min(right, vw - EDGE - width));
    setPos({ top: r.bottom + 14, right, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await cmsFetch(`/api/cms/notifications/${id}`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await cmsFetch("/api/cms/notifications/mark-all-read", { method: "POST" });
  };

  const openItem = (n: NotificationItem) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
  };

  const panel =
    open && pos
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            style={{ position: "fixed", top: pos.top, right: pos.right, width: pos.width, zIndex: 60 }}
            className="flex max-h-[min(72vh,30rem)] flex-col overflow-hidden rounded-2xl border border-white/70 bg-[#f6f1e8] shadow-[0_24px_60px_-20px_rgba(60,45,20,0.45)] dark:border-white/10 dark:bg-[#1d1914] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink/60 dark:text-white/50">
                Notifications{unread > 0 ? ` · ${unread} new` : ""}
              </span>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="focus-ring rounded-full px-2.5 py-1 text-xs font-semibold text-[rgb(var(--accent-ink))] transition hover:bg-black/5 dark:text-signal dark:hover:bg-white/10"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="focus-ring rounded-full p-1.5 text-ink/50 transition hover:bg-black/5 hover:text-ink dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-2">
              {items.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-ink/55 dark:text-white/45">You&apos;re all caught up.</p>
              )}
              {items.map((n) => {
                const content = (
                  <div
                    className={`flex gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-black/[0.05] dark:hover:bg-white/[0.06] ${
                      !n.read ? "bg-white/80 dark:bg-white/[0.05]" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] dark:bg-white/10">
                      {ICONS[n.type] || <Info size={15} className="text-ink/60 dark:text-white/50" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`line-clamp-2 block font-medium leading-snug ${n.read ? "text-ink/65 dark:text-white/60" : "text-ink dark:text-white"}`}>
                        {n.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block break-words text-xs leading-snug text-ink/55 [overflow-wrap:anywhere] dark:text-white/45">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-ink/40 dark:text-white/35">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-signal" aria-label="Unread" />}
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => openItem(n)} className="focus-ring block rounded-xl">
                    {content}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => !n.read && markRead(n.id)} className="focus-ring block w-full rounded-xl">
                    {content}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="focus-ring relative rounded-full p-2 text-ink/65 transition hover:bg-black/5 hover:text-ink dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal px-1 text-[10px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {panel}
    </>
  );
}
