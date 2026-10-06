import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/public-data";
import { postHref } from "@/lib/types";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/news`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/articles`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/search`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/tools/resume-builder`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const posts = await getPublishedPosts();
  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}${postHref(p)}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPages, ...postPages];
}
