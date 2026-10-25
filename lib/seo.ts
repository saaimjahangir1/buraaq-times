import type { Metadata } from "next";
import { Post, postHref } from "./types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://buraaqtimes.com").replace(/\/+$/, "");
export const SITE_NAME = "Buraaq Times";
export const SITE_DESCRIPTION =
  "Buraaq Times brings you breaking news, in-depth articles and fresh perspectives on politics, technology, business, sports and more.";
export const LOGO_URL = `${SITE_URL}/logo.jpg`;
export const RSS_PATH = "/feed.xml";

/** Absolute URL for a path or an already-absolute URL. */
export function absoluteUrl(pathOrUrl: string) {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Search-result snippets cut off around 155–160 characters. */
export function metaDescription(text: string, max = 158) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
}

/** Canonical link + the RSS feed link, for every public page. */
export function pageAlternates(path: string): Metadata["alternates"] {
  return {
    canonical: absoluteUrl(path),
    types: { "application/rss+xml": [{ url: absoluteUrl(RSS_PATH), title: `${SITE_NAME} — latest stories` }] },
  };
}

/** Metadata for a simple public page (list pages, About, Contact …). */
export function pageMetadata(opts: { title: string; description: string; path: string }): Metadata {
  const url = absoluteUrl(opts.path);
  return {
    title: opts.title,
    description: metaDescription(opts.description),
    alternates: pageAlternates(opts.path),
    openGraph: { type: "website", url, siteName: SITE_NAME, title: `${opts.title} | ${SITE_NAME}`, description: metaDescription(opts.description) },
    twitter: { card: "summary_large_image", title: `${opts.title} | ${SITE_NAME}`, description: metaDescription(opts.description) },
  };
}

function publishedIso(post: Post) {
  return post.publishedAt ?? new Date(post.date).toISOString();
}
function modifiedIso(post: Post) {
  return post.updatedAt ?? (post.updated ? new Date(post.updated).toISOString() : publishedIso(post));
}

export function buildPostMetadata(post: Post): Metadata {
  const path = postHref(post);
  const url = absoluteUrl(path);
  const image = absoluteUrl(post.heroImage);
  const description = metaDescription(post.summary);

  return {
    title: post.title,
    description,
    alternates: pageAlternates(path),
    keywords: post.tags,
    authors: [{ name: post.author }],
    category: post.category,
    openGraph: {
      type: "article",
      url,
      siteName: SITE_NAME,
      title: post.title,
      description,
      images: [{ url: image, width: 1600, height: 900, alt: post.title }],
      publishedTime: publishedIso(post),
      modifiedTime: modifiedIso(post),
      authors: [post.author],
      section: post.category,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [image],
    },
  };
}

const publisher = {
  "@type": "NewsMediaOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: LOGO_URL },
};

/**
 * Structured data for a story: NewsArticle (news) or Article (articles), plus
 * the breadcrumb trail Google shows above the result (Home › News › Story).
 */
export function postJsonLd(post: Post) {
  const path = postHref(post);
  const url = absoluteUrl(path);
  const section = post.type === "news" ? { name: "News", path: "/news" } : { name: "Articles", path: "/articles" };
  return [
    {
      "@context": "https://schema.org",
      "@type": post.type === "news" ? "NewsArticle" : "Article",
      "@id": `${url}#article`,
      headline: post.title.slice(0, 110),
      description: post.summary,
      image: [absoluteUrl(post.heroImage)],
      datePublished: publishedIso(post),
      dateModified: modifiedIso(post),
      author: [{ "@type": "Person", name: post.author }],
      publisher,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      articleSection: post.category,
      keywords: post.tags.join(", "),
      inLanguage: "en",
      isAccessibleForFree: true,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: section.name, item: absoluteUrl(section.path) },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
}

/** Who publishes the site and what it is — for the homepage. */
export function siteJsonLd() {
  return [
    { "@context": "https://schema.org", ...publisher, sameAs: SOCIAL_PROFILES },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ];
}

export const SOCIAL_PROFILES = [
  "https://web.facebook.com/buraaqtimes",
  "https://www.instagram.com/buraaqtimes/",
  "https://www.linkedin.com/company/82151810/",
];

/** Safe for <script type="application/ld+json">: stops "</script>" in a title from ending the tag. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
