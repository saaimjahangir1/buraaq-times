"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PostCard from "@/components/PostCard";
import Reveal from "@/components/Reveal";
import { CATEGORIES, ContentType, Post } from "@/lib/types";

export default function PostIndex({ type, initialPosts }: { type: ContentType; initialPosts: Post[] }) {
  const params = useSearchParams();
  const initial = params.get("category");
  const [active, setActive] = useState<string | null>(
    initial ? CATEGORIES.find((c) => c.toLowerCase() === initial) ?? null : null
  );

  const posts = useMemo(
    () => initialPosts.filter((p) => p.type === type && (!active || p.category === active)),
    [initialPosts, type, active]
  );

  return (
    <div className="mx-4 mt-6 mb-16 md:mx-8">
      <Reveal>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
          {type === "news" ? "All News" : "All Articles"}
        </span>
        <h1 className="font-display text-3xl font-bold text-ink dark:text-white">
          {type === "news" ? "Every story, one place" : "Long-form reading, curated"}
        </h1>
      </Reveal>

      <div className="scrollbar-thin mt-6 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActive(null)}
          className={`focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
            !active ? "bg-signal text-white" : "bg-black/[0.05] text-ink/60 dark:bg-white/10 dark:text-white/60"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              active === c ? "bg-signal text-white" : "bg-black/[0.05] text-ink/60 dark:bg-white/10 dark:text-white/60"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={Math.min(i * 0.04, 0.4)} className="h-full">
            <PostCard post={p} />
          </Reveal>
        ))}
        {posts.length === 0 && (
          <p className="col-span-full py-16 text-center text-ink/50 dark:text-white/50">
            Nothing in this category yet — check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
