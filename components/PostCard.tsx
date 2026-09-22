"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Clock, Eye } from "lucide-react";
import { Post, postHref } from "@/lib/types";

export default function PostCard({ post, size = "md" }: { post: Post; size?: "md" | "sm" }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 8);
    rx.set(-py * 8);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 800 }}
      whileHover={{ y: -6 }}
      className="glass group flex h-full flex-col overflow-hidden rounded-glass transition-shadow hover:shadow-glow"
    >
      <Link href={postHref(post)} className="focus-ring flex h-full flex-col">
        <div className={`relative overflow-hidden ${size === "sm" ? "h-36" : "h-48"}`}>
          <Image
            src={post.heroImage}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-display text-base font-bold leading-snug text-ink transition group-hover:text-signal dark:text-white">
            {post.title}
          </h3>
          {size !== "sm" && (
            <p className="line-clamp-2 text-sm text-ink/60 dark:text-white/60">{post.summary}</p>
          )}
          <div className="mt-auto flex items-center justify-between pt-2 font-mono text-[11px] text-ink/50 dark:text-white/40">
            <span>{post.author}</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {post.readTime}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={11} /> {post.views}
              </span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
