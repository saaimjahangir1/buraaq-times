"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  PlayCircle,
  PauseCircle,
  BookOpen,
  Volume2,
  Type,
  ListTree,
  Highlighter,
  Loader2,
} from "lucide-react";
import { ReaderPrefs } from "./PostReader";

type Tab = "scroll" | "read" | "vocab" | "summary" | "listen" | "prefs";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "scroll", label: "Auto Scroll", icon: <PlayCircle size={15} /> },
  { id: "read", label: "Focus Mode", icon: <BookOpen size={15} /> },
  { id: "vocab", label: "Vocabulary", icon: <Sparkles size={15} /> },
  { id: "summary", label: "AI Summary", icon: <ListTree size={15} /> },
  { id: "listen", label: "Listen", icon: <Volume2 size={15} /> },
  { id: "prefs", label: "Preferences", icon: <Type size={15} /> },
];

interface SummaryResult {
  quick: string;
  detailed: string;
  bullets: string[];
}

export default function ReadingAssistant({
  post,
  prefs,
  setPrefs,
}: {
  post: { title: string; body: string[] };
  prefs: ReaderPrefs;
  setPrefs: (p: ReaderPrefs) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("scroll");

  // AI summary — fetched once, lazily, on first visit to the tab.
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryMode, setSummaryMode] = useState<"quick" | "detailed" | "bullets">("quick");

  const loadSummary = async () => {
    if (summary || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: post.title, body: post.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Summary failed");
      setSummary(data);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Summary failed");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "summary") loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Auto-scroll
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(2);
  useEffect(() => {
    if (!scrolling) return;
    const id = setInterval(() => window.scrollBy(0, speed), 30);
    return () => clearInterval(id);
  }, [scrolling, speed]);

  // Listen mode — reads the full article aloud via the browser's speech
  // engine, one paragraph per utterance. Chrome has a known bug where a
  // single very long utterance silently stops after ~15s; chunking per
  // paragraph and chaining via onend sidesteps that, and also means Stop
  // halts cleanly at a paragraph boundary instead of mid-sentence.
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  const listenQueueRef = useRef<string[]>([]);
  const listenIndexRef = useRef(0);
  const listenStoppedRef = useRef(false);

  const speakNextChunk = () => {
    if (listenStoppedRef.current) return;
    const queue = listenQueueRef.current;
    const i = listenIndexRef.current;
    if (i >= queue.length) {
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(queue[i]);
    utter.rate = rateRef.current;
    utter.onend = () => {
      if (listenStoppedRef.current) return;
      listenIndexRef.current += 1;
      speakNextChunk();
    };
    utter.onerror = () => {
      if (listenStoppedRef.current) return;
      listenIndexRef.current += 1;
      speakNextChunk();
    };
    window.speechSynthesis.speak(utter);
  };

  const toggleListen = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) {
      listenStoppedRef.current = true;
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    listenStoppedRef.current = false;
    listenQueueRef.current = [post.title, ...post.body].filter((s) => s.trim().length > 0);
    listenIndexRef.current = 0;
    setSpeaking(true);
    speakNextChunk();
  };

  // Button follows scroll gently, stays upper-right
  const y = useMotionValue(96);
  const sy = useSpring(y, { stiffness: 120, damping: 20 });
  useEffect(() => {
    const onScroll = () => {
      const t = Math.min(window.scrollY * 0.04, 220);
      y.set(96 + t);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [y]);

  return (
    <motion.div style={{ top: sy }} className="fixed right-4 z-40 md:right-8">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="glass-strong absolute right-0 top-14 w-[320px] rounded-glass p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-display text-sm font-bold text-ink dark:text-white">
                <Sparkles size={15} className="text-signal" /> Reading Assistant
              </span>
              <button
                onClick={() => setOpen(false)}
                className="focus-ring rounded-full p-1 text-ink/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                aria-label="Close assistant"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`focus-ring flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition ${
                    tab === t.id
                      ? "bg-signal text-white"
                      : "bg-black/[0.04] text-ink/60 hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-white/60"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto text-sm text-ink/80 dark:text-white/80">
              {tab === "scroll" && (
                <div className="space-y-3">
                  <p className="text-ink/60 dark:text-white/60">
                    Let the page scroll itself at a comfortable pace.
                  </p>
                  <button
                    onClick={() => setScrolling((s) => !s)}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-signal py-2 font-semibold text-white"
                  >
                    {scrolling ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                    {scrolling ? "Pause" : "Start Auto Scroll"}
                  </button>
                  <label className="block text-xs text-ink/50 dark:text-white/50">
                    Speed
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="mt-1 w-full accent-signal"
                    />
                  </label>
                </div>
              )}

              {tab === "read" && (
                <div className="space-y-3">
                  <p className="text-ink/60 dark:text-white/60">
                    Hide distractions and widen line spacing for deep reading.
                  </p>
                  <button
                    onClick={() => setPrefs({ ...prefs, focus: !prefs.focus })}
                    className={`focus-ring flex w-full items-center justify-center gap-2 rounded-full py-2 font-semibold transition ${
                      prefs.focus
                        ? "bg-signal text-white"
                        : "bg-black/[0.06] text-ink dark:bg-white/10 dark:text-white"
                    }`}
                  >
                    <BookOpen size={16} />
                    {prefs.focus ? "Exit Focus Mode" : "Enter Focus Mode"}
                  </button>
                </div>
              )}

              {tab === "vocab" && (
                <div className="space-y-2 text-ink/60 dark:text-white/60">
                  <p>
                    Difficult words in the article are underlined. Hover or tap one — the AI
                    assistant looks up its meaning, pronunciation, an example sentence, and
                    synonyms in real time.
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-signal/10 px-2 py-1 text-[11px] font-medium text-signal">
                    Try it — look for the dotted underlines in the text
                  </span>
                </div>
              )}

              {tab === "summary" && (
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    {(["quick", "detailed", "bullets"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSummaryMode(m)}
                        className={`focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                          summaryMode === m
                            ? "bg-signal text-white"
                            : "bg-black/[0.04] text-ink/60 dark:bg-white/[0.06] dark:text-white/60"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {summaryLoading && (
                    <p className="flex items-center gap-2 text-ink/60 dark:text-white/60">
                      <Loader2 size={14} className="animate-spin" /> Generating summary...
                    </p>
                  )}
                  {summaryError && !summaryLoading && (
                    <p className="text-ink/60 dark:text-white/60">{summaryError}</p>
                  )}
                  {summary && !summaryLoading && (
                    summaryMode === "bullets" ? (
                      <ul className="list-disc space-y-1 pl-4 text-ink/70 dark:text-white/70">
                        {summary.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-ink/70 dark:text-white/70">
                        {summaryMode === "quick" ? summary.quick : summary.detailed}
                      </p>
                    )
                  )}
                </div>
              )}

              {tab === "listen" && (
                <div className="space-y-3">
                  <p className="text-ink/60 dark:text-white/60">
                    Have the full article read aloud using your browser&apos;s voice engine.
                  </p>
                  <button
                    onClick={toggleListen}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-signal py-2 font-semibold text-white"
                  >
                    {speaking ? <PauseCircle size={16} /> : <Volume2 size={16} />}
                    {speaking ? "Stop" : "Play"}
                  </button>
                  <label className="block text-xs text-ink/50 dark:text-white/50">
                    Speed
                    <input
                      type="range"
                      min={0.5}
                      max={1.75}
                      step={0.25}
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="mt-1 w-full accent-signal"
                    />
                  </label>
                </div>
              )}

              {tab === "prefs" && (
                <div className="space-y-4">
                  <label className="block text-xs text-ink/50 dark:text-white/50">
                    Font size ({prefs.fontSize}px)
                    <input
                      type="range"
                      min={15}
                      max={24}
                      value={prefs.fontSize}
                      onChange={(e) =>
                        setPrefs({ ...prefs, fontSize: Number(e.target.value) })
                      }
                      className="mt-1 w-full accent-signal"
                    />
                  </label>
                  <label className="block text-xs text-ink/50 dark:text-white/50">
                    Line height ({prefs.lineHeight.toFixed(1)})
                    <input
                      type="range"
                      min={1.4}
                      max={2.2}
                      step={0.1}
                      value={prefs.lineHeight}
                      onChange={(e) =>
                        setPrefs({ ...prefs, lineHeight: Number(e.target.value) })
                      }
                      className="mt-1 w-full accent-signal"
                    />
                  </label>
                  <label className="block text-xs text-ink/50 dark:text-white/50">
                    Content width ({prefs.width}ch)
                    <input
                      type="range"
                      min={50}
                      max={90}
                      value={prefs.width}
                      onChange={(e) => setPrefs({ ...prefs, width: Number(e.target.value) })}
                      className="mt-1 w-full accent-signal"
                    />
                  </label>
                  <label className="block text-xs text-ink/50 dark:text-white/50">
                    Font family
                    <select
                      value={prefs.font}
                      onChange={(e) =>
                        setPrefs({ ...prefs, font: e.target.value as ReaderPrefs["font"] })
                      }
                      className="mt-1 w-full rounded-lg border border-black/10 bg-white/70 p-1.5 text-ink dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      <option value="body">Sans (Inter)</option>
                      <option value="display">Display (Jakarta)</option>
                      <option value="serif">Serif</option>
                    </select>
                  </label>
                  <button
                    onClick={() => setPrefs({ ...prefs, highlightMode: !prefs.highlightMode })}
                    className={`focus-ring flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition ${
                      prefs.highlightMode
                        ? "bg-signal text-white"
                        : "bg-black/[0.06] text-ink dark:bg-white/10 dark:text-white"
                    }`}
                  >
                    <Highlighter size={15} />
                    {prefs.highlightMode ? "Exit Highlight Mode" : "Enable Highlight Mode"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Reading assistant"
        className="focus-ring flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep text-white shadow-glow transition hover:scale-105"
      >
        <Sparkles size={20} />
      </button>
    </motion.div>
  );
}
