"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { X, Mail } from "lucide-react";
import FeatherMark from "@/components/FeatherMark";
import { Post, postHref } from "@/lib/types";

const SIZE = 44;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FeatherProgressWidget({ trendingPosts }: { trendingPosts: Post[] }) {
  const [open, setOpen] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);

  // 3D tilt — same spring mechanism as PostCard, tightened for a 44px button
  const btnRef = useRef<HTMLButtonElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 260, damping: 18 });
  const sry = useSpring(ry, { stiffness: 260, damping: 18 });
  const shadowX = useTransform(sry, [-9, 9], [5, -5]);
  const shadowY = useTransform(srx, [-9, 9], [-2, 6]);

  const onTiltMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 9);
    rx.set(-py * 9);
  };
  const onTiltLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  useEffect(() => {
    let raf: number | null = null;

    const update = () => {
      raf = null;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;

      if (ringRef.current) {
        const offset = CIRCUMFERENCE * (1 - pct / 100);
        ringRef.current.style.strokeDashoffset = String(offset);
      }
    };

    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  const [featured, ...rest] = trendingPosts;

  return (
    <>
      <div className="feather-progress-idle fixed right-4 top-[92px] z-[91] md:right-8">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full bg-black/40 blur-md"
          style={{ x: shadowX, y: shadowY }}
        />
        <motion.button
          ref={btnRef}
          onClick={() => setOpen((o) => !o)}
          onMouseMove={onTiltMove}
          onMouseLeave={onTiltLeave}
          aria-label="Trending stories"
          aria-expanded={open}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.94 }}
          style={{
            width: SIZE,
            height: SIZE,
            rotateX: srx,
            rotateY: sry,
            transformPerspective: 800,
          }}
          className="focus-ring relative z-10 flex items-center justify-center rounded-full bg-white shadow-glow dark:bg-charcoal"
        >
          <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-black/10 dark:text-white/10" />
            <circle
              ref={ringRef}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="url(#featherRingGradient)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE}
              style={{ transition: "stroke-dashoffset 75ms linear" }}
            />
            <defs>
              <linearGradient id="featherRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2F6BFF" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
          </svg>
          <FeatherMark size={16} className="relative text-signal" />
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[92]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed right-4 top-[76px] z-[93] w-[360px] overflow-hidden rounded-2xl border border-signal/20 bg-charcoal/95 shadow-[0_0_40px_-8px_rgba(47,107,255,0.45)] backdrop-blur-xl md:right-8"
            >
              <div className="relative border-b border-white/10 bg-gradient-to-r from-signal/15 via-transparent to-cyan/15 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-cyan">
                    Trending — Issue No. {new Date().getDate()}
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="focus-ring rounded-full p-1 text-white/50 hover:bg-white/10"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="max-h-[440px] overflow-y-auto">
                {trendingPosts.length === 0 && (
                  <p className="p-6 text-center text-sm text-white/40">Nothing trending right now.</p>
                )}

                {featured && (
                  <Link
                    href={postHref(featured)}
                    onClick={() => setOpen(false)}
                    className="focus-ring group relative flex h-36 items-end overflow-hidden border-b border-white/10"
                  >
                    <Image
                      src={featured.image}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="360px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="relative p-4">
                      <span className="mb-1.5 inline-block rounded-full bg-signal px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white">
                        {featured.category}
                      </span>
                      <p className="line-clamp-2 font-display text-base font-bold leading-snug text-white">
                        {featured.title}
                      </p>
                    </div>
                  </Link>
                )}

                <div className="divide-y divide-white/5">
                  {rest.map((p, i) => (
                    <Link
                      key={p.slug}
                      href={postHref(p)}
                      onClick={() => setOpen(false)}
                      className="focus-ring group flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
                    >
                      <span className="font-mono text-lg font-bold text-white/15 transition group-hover:text-signal">
                        {String(i + 2).padStart(2, "0")}
                      </span>
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                        <Image src={p.image} alt="" fill className="object-cover" sizes="44px" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block font-mono text-[9px] uppercase tracking-wide text-cyan/80">
                          {p.category}
                        </span>
                        <span className="line-clamp-2 text-sm font-medium text-white/90">{p.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href="/#newsletter"
                onClick={() => setOpen(false)}
                className="focus-ring flex items-center justify-center gap-2 border-t border-white/10 bg-gradient-to-r from-signal to-cyanDeep py-3 text-sm font-semibold text-white"
              >
                <Mail size={14} /> Get these in your inbox
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
