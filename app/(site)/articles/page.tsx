import { Suspense } from "react";
import PostIndex from "@/components/PostIndex";
import { getPublishedPosts } from "@/lib/public-data";

export const revalidate = 60;

export default async function ArticlesIndexPage() {
  const posts = await getPublishedPosts("article");
  return (
    <Suspense>
      <PostIndex type="article" initialPosts={posts} />
    </Suspense>
  );
}
