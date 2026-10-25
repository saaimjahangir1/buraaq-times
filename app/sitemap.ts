import type { MetadataRoute } from "next";
import { getPostsForIndexing } from "@/lib/public-data";
import { postHref } from "@/lib/types";
import { SITE_URL } from "@/lib/seo";

// Rebuilt at most every 10 minutes, so new stories appear quickly.
export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPostsForIndexing();
  const latest = posts[0]?.updatedAt ?? new Date();
  const latestOf = (type: "news" | "article") => posts.find((p) => p.type === type)?.updatedAt ?? latest;

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: latest, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/news`, lastModified: latestOf("news"), changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/articles`, lastModified: latestOf("article"), changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/tools/resume-builder`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Every published story — no cap, so older stories stay discoverable.
  const postPages: MetadataRoute.Sitemap = posts.map((p) => {
    const ageDays = (Date.now() - p.publishedAt.getTime()) / 86_400_000;
    return {
      url: `${SITE_URL}${postHref(p)}`,
      lastModified: p.updatedAt,
      changeFrequency: ageDays < 2 ? "hourly" : ageDays < 30 ? "daily" : "monthly",
      priority: ageDays < 2 ? 0.9 : ageDays < 30 ? 0.8 : 0.6,
    };
  });

  return [...staticPages, ...postPages];
}
