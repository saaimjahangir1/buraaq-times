import type { Metadata } from "next";
import { Post, postHref } from "./types";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://buraaqtimes.example";
export const SITE_NAME = "Buraaq Times";

export function buildPostMetadata(post: Post): Metadata {
  const url = `${SITE_URL}${postHref(post)}`;
  const publishedTime = new Date(post.date).toISOString();
  const modifiedTime = post.updated ? new Date(post.updated).toISOString() : publishedTime;

  return {
    title: `${post.title} | ${SITE_NAME}`,
    description: post.summary,
    alternates: { canonical: url },
    keywords: post.tags,
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      url,
      siteName: SITE_NAME,
      title: post.title,
      description: post.summary,
      images: [{ url: post.heroImage, width: 1600, height: 900, alt: post.title }],
      publishedTime,
      modifiedTime,
      authors: [post.author],
      section: post.category,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      images: [post.heroImage],
    },
  };
}

/**
 * NewsArticle / Article JSON-LD, rendered as a <script> tag by the caller.
 * Uses the schema.org type appropriate to the content type.
 */
export function postJsonLd(post: Post) {
  const url = `${SITE_URL}${postHref(post)}`;
  return {
    "@context": "https://schema.org",
    "@type": post.type === "news" ? "NewsArticle" : "Article",
    headline: post.title,
    description: post.summary,
    image: [post.heroImage],
    datePublished: new Date(post.date).toISOString(),
    dateModified: new Date(post.updated ?? post.date).toISOString(),
    author: [{ "@type": "Person", name: post.author }],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      // No dedicated logo asset ships with this slice — point a real one
      // here (e.g. /logo.png in /public) before relying on this in
      // production; Google's structured-data validator expects it.
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.jpg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: post.category,
    keywords: post.tags.join(", "),
  };
}
