"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Clock } from "lucide-react";
import { Post, postHref } from "@/lib/types";
import BrandMark from "@/components/BrandMark";

export default function Hero({ post }: { post: Post }) {
  const ref = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const glowX = useSpring(useTransform(mx, [0, 1], ["10%", "90%"]), {
    stiffness: 60,
    damping: 20,
  });
  const glowY = useSpring(useTransform(my, [0, 1], ["10%", "90%"]), {
    stiffness: 60,
    damping: 20,
  });

  const handleMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  // GSAP entrance timeline + scroll-driven parallax on the hero image.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(badgeRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 })
        .fromTo(
          headlineRef.current,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.3"
        )
        .fromTo(
          summaryRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          "-=0.4"
        )
        .fromTo(ctaRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.35");

      if (imageWrapRef.current && ref.current) {
        gsap.to(imageWrapRef.current, {
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, ref);

    return () => ctx.revert();
  }, [post.slug]);

  return (
    <section
      ref={ref}
      onMouseMove={handleMove}
      className="relative mx-4 overflow-hidden rounded-glass md:mx-8"
    >
      {/* Ambient aurora */}
      <div className="aurora">
        <div className="aurora-blob left-0 top-0 h-96 w-96 bg-signal" />
        <div
          className="aurora-blob right-0 bottom-0 h-96 w-96 bg-cyan"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative min-h-[520px] w-full md:aspect-video md:min-h-[420px]">
        <div ref={imageWrapRef} className="absolute inset-0 scale-110">
          <Image src={post.image} alt="" fill priority className="object-cover" sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute left-4 top-4 z-10 md:left-6 md:top-6">
          <BrandMark idle={false} className="aspect-[423/125] h-8 md:h-10 [filter:brightness(0)_invert(1)] drop-shadow-md" />
        </div>

        {/* mouse-follow lighting */}
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(600px circle at ${glowX} ${glowY}, rgba(47,107,255,0.35), transparent 70%)`,
          }}
        />

        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
          <div className="glass mx-auto max-w-2xl rounded-glass p-6 text-center md:p-8">
            <div
              ref={badgeRef}
              className="mb-3 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-widest text-white/80"
            >
              <span className="rounded-full bg-signal px-3 py-1 font-semibold text-white">
                {post.category}
              </span>
              <span>{post.date}</span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> {post.readTime}
              </span>
            </div>
            <h1
              ref={headlineRef}
              className="font-display text-2xl font-bold leading-tight text-white md:text-4xl"
            >
              {post.title}
            </h1>
            <p ref={summaryRef} className="mt-3 text-sm text-white/80 md:text-base">
              {post.summary}
            </p>
            <div ref={ctaRef} className="mt-5 flex items-center justify-between">
              <span className="text-sm text-white/70">
                By <span className="font-medium text-white">{post.author}</span>
              </span>
              <Link
                href={postHref(post)}
                className="focus-ring group flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/90"
              >
                Read More
                <ArrowUpRight
                  size={15}
                  className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
