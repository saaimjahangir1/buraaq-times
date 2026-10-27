"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";

// The bell in the top bar: turns "new story" notifications on or off for
// this device (laptop, phone…). Uses the browser's own Web Push, so alerts
// arrive even when the site isn't open.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on";

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function NotifyBell() {
  const [state, setState] = useState<State>("loading");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!VAPID_PUBLIC_KEY) return null;

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        await sub.unsubscribe().catch(() => {});
        throw new Error(data.error || "Couldn't turn on notifications. Please try again.");
      }
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn on notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Couldn't turn notifications off. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const on = state === "on";
  const canToggle = state === "on" || state === "off";

  return (
    // Inline position: the glass classes set position: relative and would win over a utility class.
    <div ref={wrap} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={on ? "Story notifications are on" : "Get notified about new stories"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="focus-ring relative rounded-full p-1.5 text-ink/70 transition hover:bg-signal/10 hover:text-signal dark:text-white/70 sm:p-2"
      >
        {on ? <BellRing size={18} className="text-signal" /> : <Bell size={18} />}
        {on && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-signal" aria-hidden="true" />}
      </button>

      {open && (
        // Positioning lives on a plain wrapper (the glass panel's own position rule would override it):
        // full-width under the top bar on phones, a dropdown under the bell from tablet size up.
        <div className="fixed inset-x-4 top-20 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-72">
        <div role="dialog" aria-label="Story notifications" className="glass-strong rounded-2xl p-4 text-left shadow-glass-dark">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-sm font-bold text-ink dark:text-white">New story alerts</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/60 dark:text-white/60">
                Get a notification on this device whenever we publish a new news story or article.
              </p>
            </div>
            {canToggle && (
              <button
                role="switch"
                aria-checked={on}
                aria-label="Notify me about new stories"
                disabled={busy}
                onClick={on ? turnOff : turnOn}
                className={`focus-ring relative mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition disabled:opacity-60 ${
                  on ? "bg-signal" : "bg-black/15 dark:bg-white/15"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`}
                >
                  {busy && <Loader2 size={12} className="animate-spin text-ink/60" />}
                </span>
              </button>
            )}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink/55 dark:text-white/50">
            {state === "loading" && "Checking this device…"}
            {state === "on" && "On for this device. Turn it off here any time."}
            {state === "off" && "Your browser will ask for permission when you turn it on."}
            {state === "blocked" &&
              "Notifications are blocked for this site in your browser settings. Allow them there (the lock icon next to the address), then come back."}
            {state === "ios-install" &&
              "On iPhone or iPad: tap Share → Add to Home Screen, open Buraaq Times from your home screen, then turn this on."}
            {state === "unsupported" && "This browser doesn't support notifications. Try Chrome, Edge, Firefox or Safari."}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
