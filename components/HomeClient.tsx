"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ContentSwitch from "@/components/ContentSwitch";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import LatestGrid from "@/components/LatestGrid";
import CategorySection from "@/components/CategorySection";
import PostRail from "@/components/PostRail";
import Newsletter from "@/components/Newsletter";
import { CATEGORIES, ContentType, Post } from "@/lib/types";

export default function HomeClient({ posts: allPosts }: { posts: Post[] }) {
  const [mode, setMode] = useState<ContentType>("news");

  const posts = useMemo(() => allPosts.filter((p) => p.type === mode), [allPosts, mode]);
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const trending = posts.filter((p) => p.trending);
  const editorsPicks = posts.filter((p) => p.editorsPick);
  const categoriesWithPosts = CATEGORIES.map((c) => ({
    category: c,
    items: posts.filter((p) => p.category === c),
  })).filter((c) => c.items.length > 0);

  // Shuffled client-side, after mount, so server and client HTML match on
  // the first render (Math.random() during SSR would otherwise produce a
  // hydration mismatch).
  const [recommended, setRecommended] = useState<Post[]>([]);
  useEffect(() => {
    setRecommended([...posts].sort(() => 0.5 - Math.random()).slice(0, 6));
  }, [posts]);

  return (
    <div className="pb-4">
      <div className="flex flex-col items-center gap-8 pt-2">
        <ContentSwitch value={mode} onChange={setMode} />

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full"
          >
            {featured ? (
              <Hero post={featured} />
            ) : (
              <p className="mx-4 py-24 text-center text-ink/40 dark:text-white/40 md:mx-8">
                No {mode === "news" ? "news" : "articles"} published yet — check back soon, or
                publish one from the CMS.
              </p>
            )}
            {posts.length > 0 && (
              <Ticker posts={posts.slice(0, 6)} label={mode === "news" ? "Breaking" : "New Reads"} />
            )}

            {posts.length > 0 && <LatestGrid posts={posts} type={mode} />}

            {categoriesWithPosts.slice(0, 4).map(({ category, items }) => (
              <CategorySection key={category} category={category} posts={items} type={mode} />
            ))}

            <PostRail
              eyebrow="Trending Now"
              title="Most viewed, shared & discussed"
              posts={trending}
              rankBadge
            />

            <PostRail
              eyebrow="Editor's Picks"
              title="Handpicked by our editorial team"
              posts={editorsPicks}
            />

            <PostRail
              eyebrow="For You"
              title="Recommended based on your reading"
              posts={recommended}
            />

            <Newsletter />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
