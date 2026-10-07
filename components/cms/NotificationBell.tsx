"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, MessageSquare, AlertTriangle, UserCog, Info } from "lucide-react";
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
  PUBLISH_CONFIRMATION: <CheckCircle2 size={15} className="text-signal" />,
  COMMENT_ALERT: <MessageSquare size={15} className="text-cyan" />,
  SEO_ALERT: <AlertTriangle size={15} className="text-amber-400" />,
  ACCOUNT: <UserCog size={15} className="text-signal" />,
  DRAFT_REMINDER: <Info size={15} className="text-white/50" />,
  SYSTEM: <Info size={15} className="text-white/50" />,
  REVIEW: <AlertTriangle size={15} className="text-red-400" />,
};

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const res = await fetch("/api/cms/notifications");
    const data = await res.json();
    setItems(data.notifications ?? []);
    setUnread(data.unreadCount ?? 0);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="focus-ring relative rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-strong absolute right-0 top-11 z-50 max-h-96 w-80 overflow-y-auto rounded-glass p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Notifications
            </span>
            {unread > 0 && (
              <button onClick={markAllRead} className="focus-ring text-xs text-signal hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-white/40">You&apos;re all caught up.</p>
          )}
          {items.map((n) => {
            const content = (
              <div
                className={`flex gap-2.5 rounded-xl p-2.5 text-sm transition hover:bg-white/5 ${
                  !n.read ? "bg-white/[0.03]" : ""
                }`}
              >
                <span className="mt-0.5 shrink-0">{ICONS[n.type] || <Info size={15} />}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${n.read ? "text-white/60" : "text-white"}`}>
                    {n.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-white/40">{n.body}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />}
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} onClick={() => !n.read && markRead(n.id)}>
                {content}
              </Link>
            ) : (
              <button key={n.id} onClick={() => !n.read && markRead(n.id)} className="block w-full text-left">
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
