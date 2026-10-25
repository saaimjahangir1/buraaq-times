import "server-only";
import { prisma } from "./prisma";
import { Post, ContentType } from "./types";
import { htmlToParagraphs, formatViews, formatDate } from "./content-format";
import { roleLabel, Role } from "./auth";

interface PostRow {
  slug: string;
  type: string;
  title: string;
  summary: string;
  bodyHtml: string;
  publishedAt: Date | null;
  status: string;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  readTimeMinutes: number;
  featuredImageUrl: string | null;
  brandedFeaturedImageUrl: string | null;
  likeCount: number;
  saveCount: number;
  featured: boolean;
  trending: boolean;
  editorsPick: boolean;
  views: number;
  category: { name: string } | null;
  tags: { name: string }[];
  author: { name: string; role: string };
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&q=80";

// A post is publicly visible once it's PUBLISHED, or once a SCHEDULED
// post's scheduledAt has passed — this is the "flip" mechanism instead of
// a cron job: nothing has to run in the background, the read query itself
// treats due-scheduled posts as live.
function publicWhere(extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", scheduledAt: { lte: new Date() } }],
  };
}

const include = {
  category: true,
  tags: true,
  author: { select: { name: true, role: true } },
} as const;

/** When a post went live: its publish time, or for a scheduled post the time it was scheduled for. */
export function liveSince(p: { publishedAt: Date | null; status: string; scheduledAt: Date | null; createdAt: Date }): Date {
  return p.publishedAt ?? (p.status === "SCHEDULED" && p.scheduledAt ? p.scheduledAt : p.createdAt);
}

function toPublicPost(p: PostRow): Post {
  const roleName = roleLabel(p.author.role as Role);
  const live = liveSince(p);
  return {
    slug: p.slug,
    type: p.type as ContentType,
    category: p.category?.name ?? "General",
    title: p.title,
    summary: p.summary,
    author: p.author.name,
    authorRole: roleName === "Admin" ? "Editor" : roleName,
    date: formatDate(live),
    updated: p.updatedAt.getTime() - live.getTime() > 60_000 ? formatDate(p.updatedAt) : undefined,
    publishedAt: live.toISOString(),
    updatedAt: (p.updatedAt > live ? p.updatedAt : live).toISOString(),
    readTime: `${p.readTimeMinutes} min`,
    image: p.featuredImageUrl || PLACEHOLDER_IMAGE,
    heroImage: p.brandedFeaturedImageUrl || p.featuredImageUrl || PLACEHOLDER_IMAGE,
    featured: p.featured,
    trending: p.trending,
    editorsPick: p.editorsPick,
    likeCount: p.likeCount,
    saveCount: p.saveCount,
    views: formatViews(p.views),
    tags: p.tags.map((t) => t.name),
    body: htmlToParagraphs(p.bodyHtml),
  };
}

function withFeaturedFallback(posts: Post[], type: ContentType): Post[] {
  const ofType = posts.filter((p) => p.type === type);
  if (ofType.length && !ofType.some((p) => p.featured)) ofType[0].featured = true;
  return posts;
}

export async function getPublishedPosts(type?: ContentType): Promise<Post[]> {
  const rows = await prisma.post.findMany({
    where: publicWhere(type ? { type } : {}),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include,
    take: 200,
  });
  let posts = rows.map(toPublicPost);
  if (type) posts = withFeaturedFallback(posts, type);
  else {
    posts = withFeaturedFallback(posts, "news");
    posts = withFeaturedFallback(posts, "article");
  }
  return posts;
}

export async function getPublicPost(type: ContentType, slug: string): Promise<Post | null> {
  const row = await prisma.post.findFirst({
    where: publicWhere({ type, slug }),
    include,
  });
  return row ? toPublicPost(row) : null;
}

export async function getApprovedComments(slug: string, type: ContentType) {
  const post = await prisma.post.findFirst({ where: { slug, type }, select: { id: true } });
  if (!post) return [];
  const comments = await prisma.comment.findMany({
    where: { postId: post.id, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: { id: true, authorName: true, body: true, createdAt: true },
  });
  return comments.map((c: { id: string; authorName: string; body: string }) => ({
    id: c.id,
    name: c.authorName,
    text: c.body,
  }));
}

export async function getVisitorReactions(type: ContentType, slug: string, visitorId: string | null) {
  if (!visitorId) return { liked: false, saved: false };
  const post = await prisma.post.findFirst({ where: { type, slug }, select: { id: true } });
  if (!post) return { liked: false, saved: false };
  const reactions = await prisma.postReaction.findMany({
    where: { postId: post.id, visitorId },
    select: { type: true },
  });
  return {
    liked: reactions.some((r) => r.type === "LIKE"),
    saved: reactions.some((r) => r.type === "SAVE"),
  };
}

export async function getPostIdBySlug(type: ContentType, slug: string) {
  const post = await prisma.post.findFirst({ where: { type, slug }, select: { id: true } });
  return post?.id ?? null;
}

/**
 * Every public post, lightly (no body text), for the sitemap and search-engine
 * feeds. Unlike getPublishedPosts there's no 200-post cap, so older posts stay
 * discoverable as the archive grows.
 */
export async function getPostsForIndexing(opts: { since?: Date; limit?: number } = {}) {
  const rows = await prisma.post.findMany({
    where: publicWhere(),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: opts.limit ?? 45_000,
    select: {
      slug: true,
      type: true,
      title: true,
      summary: true,
      status: true,
      publishedAt: true,
      scheduledAt: true,
      createdAt: true,
      updatedAt: true,
      featuredImageUrl: true,
      brandedFeaturedImageUrl: true,
      category: { select: { name: true } },
      tags: { select: { name: true } },
      author: { select: { name: true } },
    },
  });
  const posts = rows.map((r) => {
    const live = liveSince(r);
    return {
      slug: r.slug,
      type: r.type as ContentType,
      title: r.title,
      summary: r.summary,
      publishedAt: live,
      updatedAt: r.updatedAt > live ? r.updatedAt : live,
      image: r.brandedFeaturedImageUrl || r.featuredImageUrl || null,
      category: r.category?.name ?? "General",
      tags: r.tags.map((t: { name: string }) => t.name),
      author: r.author.name,
    };
  });
  return opts.since ? posts.filter((p) => p.updatedAt >= opts.since! || p.publishedAt >= opts.since!) : posts;
}
