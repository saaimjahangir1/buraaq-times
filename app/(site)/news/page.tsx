import { Suspense } from "react";
import PostIndex from "@/components/PostIndex";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/public-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Latest News",
  description: "Breaking news and the latest updates from Pakistan and around the world — politics, business, technology, sports and more, from Buraaq Times.",
  path: "/news",
});

export const revalidate = 60;

export default async function NewsIndexPage() {
  const posts = await getPublishedPosts("news");
  return (
    <Suspense>
      <PostIndex type="news" initialPosts={posts} />
    </Suspense>
  );
}
