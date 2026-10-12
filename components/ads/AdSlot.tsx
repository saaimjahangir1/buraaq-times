"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ADSENSE_CLIENT } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One manual AdSense ad unit. Renders nothing until AdSense is configured and
 * a slot ID is given.
 *
 * Client-side navigation keeps the page alive between articles, so the unit is
 * re-created (keyed by path) and requested again on every page change —
 * otherwise each ad would only ever fill on the first page a reader opens.
 */
export default function AdSlot({
  slot,
  format = "auto",
  layout,
  minHeight = 280,
  className = "",
}: {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  /** e.g. "in-article" for in-article units */
  layout?: string;
  /** Space reserved before the ad loads, so the text below doesn't jump. */
  minHeight?: number;
  className?: string;
}) {
  const pathname = usePathname();
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const el = insRef.current;
    if (!el || el.getAttribute("data-adsbygoogle-status")) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers and duplicate pushes throw here — never break the page for an ad.
    }
  }, [pathname]);

  if (!ADSENSE_CLIENT || !slot) return null;

  return (
    <aside
      key={pathname}
      aria-label="Advertisement"
      className={`ad-slot my-8 ${className}`}
    >
      <p className="mb-1.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink/35 dark:text-white/35">
        Advertisement
      </p>
      <div className="overflow-hidden rounded-2xl" style={{ minHeight }}>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block", minHeight }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={format}
          {...(layout ? { "data-ad-layout": layout } : {})}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
