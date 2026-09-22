"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Post } from "@/lib/types";
import { Radio } from "lucide-react";

export default function Ticker({ posts, label }: { posts: Post[]; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const items = [...posts, ...posts];

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const tween = gsap.to(el, {
      xPercent: -50,
      duration: 28,
      ease: "none",
      repeat: -1,
    });

    const pause = () => tween.pause();
    const resume = () => tween.play();
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);

    return () => {
      tween.kill();
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
    };
  }, []);

  return (
    <div className="mx-4 mt-6 flex items-center gap-3 overflow-hidden rounded-full border border-black/[0.06] bg-white/50 py-2.5 pl-2 pr-4 backdrop-blur-glass dark:border-white/[0.08] dark:bg-white/[0.03] md:mx-8">
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-signal px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
        <Radio size={12} className="animate-pulse-glow" />
        {label}
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div ref={trackRef} className="flex w-max gap-10 whitespace-nowrap">
          {items.map((p, i) => (
            <span key={i} className="text-sm text-ink/70 dark:text-white/70">
              <span className="mr-2 font-mono text-xs text-signal">{p.category}</span>
              {p.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
