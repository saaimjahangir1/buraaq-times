"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface VocabEntry {
  pronunciation: string;
  meaning: string;
  example: string;
  synonyms: string[];
}

const cache = new Map<string, VocabEntry>();
const CARD_WIDTH = 256;
const GAP = 8;
const EST_CARD_HEIGHT = 190;

export default function DifficultWord({ word, sentence }: { word: string; sentence: string }) {
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<VocabEntry | null>(cache.get(word.toLowerCase()) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const load = async () => {
    const key = word.toLowerCase();
    if (cache.has(key)) {
      setEntry(cache.get(key)!);
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

  const openCard = () => {
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const width = Math.min(CARD_WIDTH, window.innerWidth - 16);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

      const spaceBelow = window.innerHeight - rect.bottom;
      const flipAbove = spaceBelow < EST_CARD_HEIGHT && rect.top > EST_CARD_HEIGHT;

      setPos(
        flipAbove
          ? { left, width, bottom: window.innerHeight - rect.top + GAP }
          : { left, width, top: rect.bottom + GAP }
      );
    }
    setOpen(true);
    if (!entry) load();
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (cardRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        onMouseEnter={() => {
          cancelClose();
          openCard();
        }}
        onMouseLeave={scheduleClose}
        onClick={() => (open ? setOpen(false) : openCard())}
        className="focus-ring rounded underline decoration-signal decoration-dotted underline-offset-4"
      >
        {word}
      </button>
      <AnimatePresence>
        {open &&
          pos &&
          createPortal(
            <motion.div
              key="vocab-card"
              ref={cardRef}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="glass-strong z-[999] rounded-2xl p-4 text-left text-sm normal-case shadow-2xl"
              style={{
                position: "fixed",
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
                    <span className="font-mono text-xs font-normal text-signal">
                      /{entry.pronunciation}/
                    </span>
                  </span>
                  <span className="mt-1 block text-ink/70 dark:text-white/70">{entry.meaning}</span>
                  <span className="mt-2 block italic text-ink/50 dark:text-white/50">
                    &ldquo;{entry.example}&rdquo;
                  </span>
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
                </>
              )}
            </motion.div>,
            document.body
          )}
      </AnimatePresence>
    </span>
  );
}
