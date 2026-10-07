import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// The editable fields of a post, shared by the editor's PATCH route, the
// "submit for proofreading" route and the proofreader's approve/reject
// actions — so every path applies changes to a Post in exactly the same way.

export const postFieldsSchema = z.object({
  title: z.string().min(3).optional(),
  summary: z.string().min(3).optional(),
  bodyHtml: z.string().min(1).optional(),
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

export type PostFields = z.infer<typeof postFieldsSchema>;

export function estimateReadTime(html: string) {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Turns validated fields into a Prisma update. Fields left undefined are not touched. */
// Same "unchecked" shape (plain categoryId) the original PATCH route used.
export function fieldsToPostUpdate(data: PostFields): Prisma.PostUncheckedUpdateInput {
  return {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.summary !== undefined && { summary: data.summary }),
    ...(data.bodyHtml !== undefined && {
      bodyHtml: data.bodyHtml,
      readTimeMinutes: estimateReadTime(data.bodyHtml),
    }),
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
  };
}

/** Reads a review's stored payload back; anything malformed is ignored rather than crashing. */
export function parseStoredFields(json: string | null | undefined): PostFields {
  if (!json) return {};
  try {
    const parsed = postFieldsSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}
