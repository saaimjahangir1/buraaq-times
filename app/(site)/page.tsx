import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/public-data";
import HomeClient from "@/components/HomeClient";
import { pageAlternates, siteJsonLd, jsonLdString } from "@/lib/seo";

export const metadata: Metadata = { alternates: pageAlternates("/") };

// Revalidate every 60s so newly published CMS posts show up without a
// full rebuild, while still getting the performance benefit of caching.
export const revalidate = 60;

export default async function Home() {
  const posts = await getPublishedPosts();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(siteJsonLd()) }} />
      <HomeClient posts={posts} />
    </>
  );
}
