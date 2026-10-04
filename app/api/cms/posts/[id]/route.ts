import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { notify } from "@/lib/notifications";

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  summary: z.string().min(3).optional(),
  bodyHtml: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tagNames: z.array(z.string()).optional(),
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

async function loadAndAuthorize(id: string, userId: string, role: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (role !== "ADMIN" && post.authorId !== userId) {
    return { error: NextResponse.json({ error: "Not your post" }, { status: 403 }) };
  }
  return { post };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser();
  if (isNextResponse(guard)) return guard;

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { category: true, tags: true, author: { select: { name: true } } },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (guard.role !== "ADMIN" && post.authorId !== guard.id) {
    return NextResponse.json({ error: "Not your post" }, { status: 403 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const { error, post: existing } = await loadAndAuthorize(params.id, guard.id, guard.role);
  if (error) return error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const data = parsed.data;

  const willPublishNow = data.status === "PUBLISHED" && existing!.status !== "PUBLISHED";

  const post = await prisma.post.update({
    where: { id: params.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.bodyHtml !== undefined && {
        bodyHtml: data.bodyHtml,
        readTimeMinutes: estimateReadTime(data.bodyHtml),
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.status === "SCHEDULED" && data.scheduledAt
        ? { scheduledAt: new Date(data.scheduledAt) }
        : {}),
      ...(willPublishNow && { publishedAt: new Date() }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      ...(data.tagNames !== undefined && {
        tags: {
          set: [],
          connectOrCreate: data.tagNames.map((name) => ({ where: { name }, create: { name } })),
        },
      }),
      ...(data.featuredImageUrl !== undefined && { featuredImageUrl: data.featuredImageUrl }),
      ...(data.featuredImageAlt !== undefined && { featuredImageAlt: data.featuredImageAlt }),
      ...(data.brandedFeaturedImageUrl !== undefined && { brandedFeaturedImageUrl: data.brandedFeaturedImageUrl }),
      ...(data.brandedSocialImageUrl !== undefined && { brandedSocialImageUrl: data.brandedSocialImageUrl }),
      ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
      ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
      ...(data.focusKeyword !== undefined && { focusKeyword: data.focusKeyword }),
      ...(data.secondaryKeywords !== undefined && { secondaryKeywords: data.secondaryKeywords }),
      ...(data.ogDescription !== undefined && { ogDescription: data.ogDescription }),
      ...(data.twitterDescription !== undefined && { twitterDescription: data.twitterDescription }),
      ...(data.readabilityScore !== undefined && { readabilityScore: data.readabilityScore }),
      ...(data.seoScore !== undefined && { seoScore: data.seoScore }),
      ...(data.featured !== undefined && { featured: data.featured }),
      ...(data.trending !== undefined && { trending: data.trending }),
      ...(data.editorsPick !== undefined && { editorsPick: data.editorsPick }),
    },
  });

  if (data.title || data.bodyHtml) {
    await prisma.postRevision.create({
      data: {
        postId: post.id,
        title: post.title,
        bodyHtml: post.bodyHtml,
        editorId: guard.id,
      },
    });
  }

  if (willPublishNow) {
    await notify(
      post.authorId,
      "PUBLISH_CONFIRMATION",
      "Your post is live",
      `"${post.title}" has been published.`,
      `/cms/${post.type === "news" ? "news" : "articles"}/${post.id}/edit`
    );
    if (post.seoScore !== null && post.seoScore < 50) {
      await notify(
        post.authorId,
        "SEO_ALERT",
        "Low SEO score on a published post",
        `"${post.title}" published with an SEO score of ${post.seoScore}/100 — consider revisiting it.`,
        `/cms/${post.type === "news" ? "news" : "articles"}/${post.id}/edit`
      );
    }
  }

  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const { error } = await loadAndAuthorize(params.id, guard.id, guard.role);
  if (error) return error;

  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
