"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface VocabEntry {
  pronunciation: string;
  meaning: string;
  example: string;
  synonyms: string[];
}

type Pos = { left: number; width: number; top?: number; bottom?: number };

const cache = new Map<string, VocabEntry>();
const CARD_WIDTH = 256;
const GAP = 8;
const EST_CARD_HEIGHT = 190;
// Hover must rest this long before opening, so sweeping the mouse across a
// paragraph doesn't fire an AI lookup for every word it passes over.
const HOVER_OPEN_DELAY = 250;
const HOVER_CLOSE_DELAY = 150;

export default function DifficultWord({ word, sentence }: { word: string; sentence: string }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<VocabEntry | null>(cache.get(word.toLowerCase()) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // true when opened by click/tap: stays open until clicked again, outside click or Esc
  const pinned = useRef(false);

  // Portals need document.body, which only exists in the browser.
  useEffect(() => setMounted(true), []);

  const clearOpenTimer = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };
  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  /** Where the card should sit, based on where the word is on screen right now. */
  const measure = useCallback((): Pos | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const width = Math.min(CARD_WIDTH, window.innerWidth - 16);
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    const spaceBelow = window.innerHeight - rect.bottom;
    const flipAbove = spaceBelow < EST_CARD_HEIGHT && rect.top > EST_CARD_HEIGHT;

    return flipAbove
      ? { left, width, bottom: window.innerHeight - rect.top + GAP }
      : { left, width, top: rect.bottom + GAP };
  }, []);

  const load = async () => {
    const key = word.toLowerCase();
    const cached = cache.get(key);
    if (cached) {
      setEntry(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word, sentence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      cache.set(key, data);
      setEntry(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const show = () => {
    const p = measure();
    if (!p) return;
    setPos(p);
    setOpen(true);
    if (!entry && !loading) load();
  };

  const hide = () => {
    clearOpenTimer();
    clearCloseTimer();
    pinned.current = false;
    setOpen(false);
  };

  // Hover: open after a short rest; close shortly after leaving (unless pinned by a click).
  const onTriggerEnter = () => {
    clearCloseTimer();
    if (open) return;
    clearOpenTimer();
    openTimer.current = setTimeout(show, HOVER_OPEN_DELAY);
  };
  const scheduleClose = () => {
    clearOpenTimer();
    if (pinned.current) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  };

  // Click / tap: open immediately and pin. Clicking the word again closes it.
  const onTriggerClick = () => {
    clearOpenTimer();
    clearCloseTimer();
    if (open && pinned.current) {
      hide();
      return;
    }
    pinned.current = true;
    if (!open) show();
  };

  useEffect(() => {
    if (!open) return;

    const close = () => {
      pinned.current = false;
      setOpen(false);
    };

    // Follow the word while scrolling (Lenis fires many small scroll events);
    // only close once the word has left the screen.
    const reposition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) {
        close();
        return;
      }
      const p = measure();
      if (p) setPos(p);
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (cardRef.current?.contains(target)) return;
      close();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("scroll", reposition, { capture: true, passive: true });
    window.addEventListener("resize", reposition);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", reposition, { capture: true });
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, measure]);

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onMouseEnter={onTriggerEnter}
        onMouseLeave={scheduleClose}
        onClick={onTriggerClick}
        className="focus-ring rounded underline decoration-signal decoration-dotted underline-offset-4"
      >
        {word}
      </button>
      {mounted &&
        createPortal(
          // AnimatePresence must be INSIDE the portal: it ignores portal children,
          // which is why the card never rendered before.
          <AnimatePresence>
            {open && pos && (
              <motion.div
                key="vocab-card"
                ref={cardRef}
                role="dialog"
                aria-label={`Meaning of ${word}`}
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleClose}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="glass-strong rounded-2xl p-4 text-left text-sm normal-case shadow-2xl"
                style={{
                  // inline position wins over .glass-strong's `relative` (see project rules)
                  position: "fixed",
                  zIndex: 9999,
                  left: pos.left,
                  width: pos.width,
                  ...(pos.top !== undefined ? { top: pos.top } : {}),
                  ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
                }}
              >
                {loading && (
                  <span className="flex items-center gap-2 text-ink/60 dark:text-white/60">
                    <Loader2 size={14} className="animate-spin" /> Asking the AI assistant...
                  </span>
                )}
                {error && !loading && (
                  <span className="block text-ink/60 dark:text-white/60">{error}</span>
                )}
                {entry && !loading && (
                  <>
                    <span className="block font-display font-bold text-ink dark:text-white">
                      {word}{" "}
                      {entry.pronunciation ? (
                        <span className="font-mono text-xs font-normal text-signal">
                          /{entry.pronunciation}/
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-ink/70 dark:text-white/70">{entry.meaning}</span>
                    {entry.example ? (
                      <span className="mt-2 block italic text-ink/50 dark:text-white/50">
                        &ldquo;{entry.example}&rdquo;
                      </span>
                    ) : null}
                    {entry.synonyms?.length ? (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {entry.synonyms.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-signal/10 px-2 py-0.5 text-[11px] font-medium text-signal"
                          >
                            {s}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </span>
  );
}
