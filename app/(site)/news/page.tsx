import { Suspense } from "react";
import PostIndex from "@/components/PostIndex";
import { getPublishedPosts } from "@/lib/public-data";

export const revalidate = 60;

export default async function NewsIndexPage() {
  const posts = await getPublishedPosts("news");
  return (
    <Suspense>
      <PostIndex type="news" initialPosts={posts} />
    </Suspense>
  );
}
