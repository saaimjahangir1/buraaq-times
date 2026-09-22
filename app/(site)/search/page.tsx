import SearchClient from "@/components/SearchClient";
import { getPublishedPosts } from "@/lib/public-data";

export const revalidate = 60;

export default async function SearchPage() {
  const posts = await getPublishedPosts();
  return <SearchClient posts={posts} />;
}
