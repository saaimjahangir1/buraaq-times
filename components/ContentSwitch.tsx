"use client";

import { motion } from "framer-motion";
import { ContentType } from "@/lib/types";

export default function ContentSwitch({
  value,
  onChange,
}: {
  value: ContentType;
  onChange: (v: ContentType) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50 dark:text-white/40">
        Explore Content
      </span>

      <div
        role="tablist"
        aria-label="Content type"
        className="glass-strong relative flex rounded-full p-1.5"
      >
        {(["news", "article"] as ContentType[]).map((t) => {
          const active = value === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t)}
              className="focus-ring relative rounded-full px-8 py-2.5 text-sm font-semibold transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="switch-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-signal to-cyanDeep shadow-glow"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span
                className={`relative z-10 ${
                  active ? "text-white" : "text-ink/60 dark:text-white/60"
                }`}
              >
                {t === "news" ? "News" : "Articles"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
