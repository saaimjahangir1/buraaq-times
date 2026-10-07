import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseStaleClaims } from "@/lib/proofread";
import { parseStoredFields } from "@/lib/post-fields";
import { postHref } from "@/lib/types";
import ReviewWorkspace from "@/components/proofread/ReviewWorkspace";

export const dynamic = "force-dynamic";

export default async function ProofreadReviewPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/proofread/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, role: true } });
  if (!me) redirect("/proofread/login");

  await releaseStaleClaims();
  const review = await prisma.postReview.findUnique({
    where: { id: params.id },
    include: {
      post: {
        select: { type: true, slug: true, status: true, title: true, summary: true, bodyHtml: true },
      },
      submittedBy: { select: { name: true } },
      claimedBy: { select: { id: true, name: true } },
    },
  });
  if (!review) notFound();

  const fields = parseStoredFields(review.payload);
  const category = fields.categoryId
    ? await prisma.category.findUnique({ where: { id: fields.categoryId }, select: { name: true } })
    : null;

  // For an edit to a live post, tell the proofreader which parts changed.
  const changed: string[] = [];
  if (review.isUpdate) {
    if (review.title !== review.post.title) changed.push("Headline");
    if (review.summary !== review.post.summary) changed.push("Summary");
    if (review.bodyHtml !== review.post.bodyHtml) changed.push("Body");
  }

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return (
    <div>
      <Link
        href="/proofread"
        className="focus-ring mb-4 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft size={15} /> Back to the queue
      </Link>
      <ReviewWorkspace
        review={{
          id: review.id,
          status: review.status,
          title: review.title,
          summary: review.summary,
          bodyHtml: review.bodyHtml,
          isUpdate: review.isUpdate,
          targetStatus: review.targetStatus,
          scheduledAt: iso(review.scheduledAt),
          createdAt: review.createdAt.toISOString(),
          claimedAt: iso(review.claimedAt),
          lastActivityAt: iso(review.lastActivityAt),
          decidedAt: iso(review.decidedAt),
          rejectReason: review.rejectReason,
          submittedBy: review.submittedBy.name,
          claimedBy: review.claimedBy?.name ?? null,
        }}
        post={{
          type: review.post.type,
          liveUrl: review.post.status === "PUBLISHED" ? postHref({ type: review.post.type as "news" | "article", slug: review.post.slug }) : null,
        }}
        fields={{
          categoryId: fields.categoryId ?? null,
          tagNames: fields.tagNames ?? [],
          featuredImageUrl: fields.featuredImageUrl ?? null,
          brandedFeaturedImageUrl: fields.brandedFeaturedImageUrl ?? null,
          brandedSocialImageUrl: fields.brandedSocialImageUrl ?? null,
        }}
        categoryName={category?.name ?? null}
        changed={changed}
        canEdit={review.status === "CLAIMED" && review.claimedById === me.id}
        canClaim={review.status === "PENDING"}
        canRelease={review.status === "CLAIMED" && (review.claimedById === me.id || me.role === "ADMIN")}
      />
    </div>
  );
}
