import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { canAccessType } from "@/lib/auth";

const createSchema = z.object({
  type: z.enum(["news", "article"]),
  title: z.string().min(3),
  summary: z.string().min(3),
  bodyHtml: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
  scheduledAt: z.string().datetime().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tagNames: z.array(z.string()).default([]),
  featuredImageUrl: z.string().optional().nullable(),
  featuredImageAlt: z.string().optional().nullable(),
  brandedFeaturedImageUrl: z.string().optional().nullable(),
  brandedSocialImageUrl: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  secondaryKeywords: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  twitterDescription: z.string().optional().nullable(),
  slugSuggestion: z.string().optional().nullable(),
  readabilityScore: z.number().optional().nullable(),
  seoScore: z.number().optional().nullable(),
  featured: z.boolean().optional(),
  trending: z.boolean().optional(),
  editorsPick: z.boolean().optional(),
});

function estimateReadTime(html: string) {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

async function uniqueSlug(base: string) {
  const root = slugify(base, { lower: true, strict: true }).slice(0, 80) || "post";
  let candidate = root;
  let i = 1;
  while (await prisma.post.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${++i}`;
  }
  return candidate;
}

export async function GET(req: NextRequest) {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const mine = searchParams.get("mine") === "true";
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};

  if (type === "news" || type === "article") {
    if (!canAccessType(guard.role, type)) {
      return NextResponse.json({ error: "Not allowed to view this content type" }, { status: 403 });
    }
    where.type = type;
  } else if (guard.role !== "ADMIN") {
    where.type = guard.role === "NEWS_EDITOR" ? "news" : "article";
  }

  if (status) where.status = status;
  if (guard.role !== "ADMIN") {
    // Non-admins only ever see their own posts — `mine` stays available
    // for admins who want that view, but can't be used to see anyone
    // else's content regardless of what a non-admin's client sends.
    where.authorId = guard.id;
  } else if (mine) {
    where.authorId = guard.id;
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
    ];
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { author: { select: { name: true } }, category: true, tags: true },
    take: 100,
  });

  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const data = parsed.data;

  if (!canAccessType(guard.role, data.type)) {
    return NextResponse.json({ error: `Not allowed to create ${data.type}` }, { status: 403 });
  }

  const slug = await uniqueSlug(data.slugSuggestion || data.title);
  const now = new Date();

  const post = await prisma.post.create({
    data: {
      type: data.type,
      title: data.title,
      slug,
      summary: data.summary,
      bodyHtml: data.bodyHtml,
      status: data.status,
      scheduledAt: data.status === "SCHEDULED" && data.scheduledAt ? new Date(data.scheduledAt) : null,
      publishedAt: data.status === "PUBLISHED" ? now : null,
      authorId: guard.id,
      categoryId: data.categoryId || null,
      tags: {
        connectOrCreate: data.tagNames.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
      featuredImageUrl: data.featuredImageUrl || null,
      featuredImageAlt: data.featuredImageAlt || null,
      brandedFeaturedImageUrl: data.brandedFeaturedImageUrl || null,
      brandedSocialImageUrl: data.brandedSocialImageUrl || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      focusKeyword: data.focusKeyword || null,
      secondaryKeywords: data.secondaryKeywords || null,
      ogDescription: data.ogDescription || null,
      twitterDescription: data.twitterDescription || null,
      slugSuggestion: data.slugSuggestion || null,
      readabilityScore: data.readabilityScore ?? null,
      seoScore: data.seoScore ?? null,
      readTimeMinutes: estimateReadTime(data.bodyHtml),
      featured: data.featured ?? false,
      trending: data.trending ?? false,
      editorsPick: data.editorsPick ?? false,
    },
  });

  await prisma.postRevision.create({
    data: { postId: post.id, title: post.title, bodyHtml: post.bodyHtml, editorId: guard.id },
  });

  return NextResponse.json({ post });
}
