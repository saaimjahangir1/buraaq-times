import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Search engines and AI assistants may read every public page. The CMS and the
// proofreading desk stay crawlable on purpose: their pages carry a "noindex"
// tag, which search engines can only see if they're allowed to fetch them.
const DISALLOW = ["/api/"];

// OpenAI's crawlers, named explicitly so ChatGPT can find, cite and link to
// Buraaq Times stories: OAI-SearchBot powers ChatGPT search, ChatGPT-User
// fetches pages when someone asks ChatGPT about them, GPTBot is OpenAI's crawler.
const OPENAI_BOTS = ["OAI-SearchBot", "ChatGPT-User", "GPTBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...OPENAI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
    host: SITE_URL,
  };
}
