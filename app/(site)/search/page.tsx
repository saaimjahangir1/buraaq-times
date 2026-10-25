import SearchClient from "@/components/SearchClient";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/public-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Search",
  description: "Search Buraaq Times news and articles by topic, category or keyword.",
  path: "/search",
});

export const revalidate = 60;

export default async function SearchPage() {
  const posts = await getPublishedPosts();
  return <SearchClient posts={posts} />;
}
