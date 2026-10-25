import { Suspense } from "react";
import PostIndex from "@/components/PostIndex";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/public-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Articles & Analysis",
  description: "In-depth analysis, opinion and features from Buraaq Times — stories and ideas worth your time.",
  path: "/articles",
});

export const revalidate = 60;

export default async function ArticlesIndexPage() {
  const posts = await getPublishedPosts("article");
  return (
    <Suspense>
      <PostIndex type="article" initialPosts={posts} />
    </Suspense>
  );
}
