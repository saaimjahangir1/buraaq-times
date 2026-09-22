import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicPost, getPublishedPosts, getApprovedComments, getVisitorReactions } from "@/lib/public-data";
import { getVisitorId } from "@/lib/visitor";
import { buildPostMetadata, postJsonLd } from "@/lib/seo";
import PostReader from "@/components/PostReader";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPublicPost("news", params.slug);
  if (!post) return {};
  return buildPostMetadata(post);
}

export default async function NewsPage({ params }: { params: { slug: string } }) {
  const post = await getPublicPost("news", params.slug);
  if (!post) notFound();

  const [sameType, comments] = await Promise.all([
    getPublishedPosts("news"),
    getApprovedComments(params.slug, "news"),
  ]);

  const pool = sameType.filter((p) => p.slug !== post.slug);
  const related = pool.filter((p) => p.category === post.category).slice(0, 3);
  const posIdx = sameType.findIndex((p) => p.slug === post.slug);
  const { liked, saved } = await getVisitorReactions("news", params.slug, getVisitorId());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd(post)) }}
      />
      <PostReader
        post={post}
        related={related.length ? related : pool.slice(0, 3)}
        prev={sameType[posIdx - 1]}
        next={sameType[posIdx + 1]}
        initialComments={comments}
        initialLiked={liked}
        initialSaved={saved}
      />
    </>
  );
}
