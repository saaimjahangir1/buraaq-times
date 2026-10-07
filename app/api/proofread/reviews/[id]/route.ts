import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProofreader, isNextResponse } from "@/lib/cms-guard";
import { fieldsToPostUpdate, parseStoredFields } from "@/lib/post-fields";
import { approvalOutcome, isLiveStatus } from "@/lib/proofread-policy";
import { releaseStaleClaims, tellEditorAboutDecision } from "@/lib/proofread";

// Approve/reject also email the editor.
export const maxDuration = 30;

// What a proofreader may change: the text, plus the branded images (which
// carry the headline, so they're regenerated if the headline changes).
const editsSchema = z.object({
  title: z.string().min(3, "The headline needs at least 3 characters").optional(),
  summary: z.string().min(3, "The summary needs at least 3 characters").optional(),
  bodyHtml: z.string().min(1, "The article body can't be empty").optional(),
  brandedFeaturedImageUrl: z.string().optional().nullable(),
  brandedSocialImageUrl: z.string().optional().nullable(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("claim") }),
  z.object({ action: z.literal("release") }),
  z.object({ action: z.literal("approve") }).merge(editsSchema),
  z
    .object({
      action: z.literal("reject"),
      reason: z.string().trim().min(5, "Tell the editor what needs fixing (at least a few words)").max(2000),
    })
    .merge(editsSchema),
]);

class Conflict extends Error {
  constructor(message: string, public status = 409) {
    super(message);
  }
}

type Edits = z.infer<typeof editsSchema>;

function editsFrom(body: Edits): Edits {
  return {
    title: body.title,
    summary: body.summary,
    bodyHtml: body.bodyHtml,
    brandedFeaturedImageUrl: body.brandedFeaturedImageUrl,
    brandedSocialImageUrl: body.brandedSocialImageUrl,
  };
}

/** Merge a proofreader's edits into the stored review. */
function applyEdits(review: { title: string; summary: string; bodyHtml: string; payload: string }, edits: Edits) {
  const fields = parseStoredFields(review.payload);
  if (edits.brandedFeaturedImageUrl !== undefined) fields.brandedFeaturedImageUrl = edits.brandedFeaturedImageUrl;
  if (edits.brandedSocialImageUrl !== undefined) fields.brandedSocialImageUrl = edits.brandedSocialImageUrl;
  return {
    title: edits.title ?? review.title,
    summary: edits.summary ?? review.summary,
    bodyHtml: edits.bodyHtml ?? review.bodyHtml,
    fields,
  };
}

async function explainClaim(id: string, meId: string) {
  const r = await prisma.postReview.findUnique({
    where: { id },
    include: { claimedBy: { select: { id: true, name: true } } },
  });
  if (!r) return new Conflict("This piece no longer exists — the editor may have deleted it.", 404);
  if (r.status === "CLAIMED" && r.claimedById !== meId) {
    return new Conflict(`${r.claimedBy?.name ?? "Another proofreader"} is already proofreading this.`);
  }
  if (r.status === "PENDING") {
    return new Conflict("Your claim expired after 24 hours without a save. Claim it again to continue.");
  }
  if (r.status === "APPROVED") return new Conflict("This has already been approved.");
  if (r.status === "REJECTED") return new Conflict("This has already been returned to the editor.");
  return new Conflict("The editor withdrew this from proofreading.");
}

/* ------------------------------------------------------------------ */
/* PATCH — save work in progress (also keeps the claim alive)           */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireProofreader(req);
  if (isNextResponse(guard)) return guard;

  const parsed = editsSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  await releaseStaleClaims();
  const review = await prisma.postReview.findUnique({ where: { id: params.id } });
  if (!review || review.status !== "CLAIMED" || review.claimedById !== guard.id) {
    const err = await explainClaim(params.id, guard.id);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  const next = applyEdits(review, parsed.data);
  const now = new Date();
  const saved = await prisma.postReview.updateMany({
    where: { id: review.id, status: "CLAIMED", claimedById: guard.id },
    data: {
      title: next.title,
      summary: next.summary,
      bodyHtml: next.bodyHtml,
      payload: JSON.stringify(next.fields),
      lastActivityAt: now,
    },
  });
  if (saved.count === 0) {
    const err = await explainClaim(params.id, guard.id);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json({ ok: true, savedAt: now });
}

/* ------------------------------------------------------------------ */
/* POST — claim / release / approve / reject                           */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireProofreader(req);
  if (isNextResponse(guard)) return guard;

  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const body = parsed.data;
  const id = params.id;
  const now = new Date();

  await releaseStaleClaims();

  try {
    if (body.action === "claim") {
      // Atomic: only one proofreader can move it from PENDING to CLAIMED.
      const claimed = await prisma.postReview.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "CLAIMED", claimedById: guard.id, claimedAt: now, lastActivityAt: now },
      });
      if (claimed.count === 0) {
        const r = await prisma.postReview.findUnique({ where: { id }, select: { status: true, claimedById: true } });
        if (r?.status === "CLAIMED" && r.claimedById === guard.id) return NextResponse.json({ ok: true });
        throw await explainClaim(id, guard.id);
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "release") {
      const released = await prisma.postReview.updateMany({
        where: { id, status: "CLAIMED", ...(guard.role === "ADMIN" ? {} : { claimedById: guard.id }) },
        data: { status: "PENDING", claimedById: null, claimedAt: null, lastActivityAt: null },
      });
      if (released.count === 0) throw await explainClaim(id, guard.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "approve") {
      const edits = editsFrom(body);
      await prisma.$transaction(async (tx) => {
        const review = await tx.postReview.findUnique({ where: { id }, include: { post: true } });
        if (!review || review.status !== "CLAIMED" || review.claimedById !== guard.id) {
          throw await explainClaim(id, guard.id);
        }
        const next = applyEdits(review, edits);
        const outcome = approvalOutcome({
          postStatus: review.post.status,
          postPublishedAt: review.post.publishedAt,
          targetStatus: review.targetStatus,
          scheduledAt: review.scheduledAt,
          now,
        });

        const locked = await tx.postReview.updateMany({
          where: { id, status: "CLAIMED", claimedById: guard.id },
          data: {
            status: "APPROVED",
            decidedAt: now,
            title: next.title,
            summary: next.summary,
            bodyHtml: next.bodyHtml,
            payload: JSON.stringify(next.fields),
          },
        });
        if (locked.count !== 1) throw await explainClaim(id, guard.id);

        await tx.post.update({
          where: { id: review.postId },
          data: {
            ...fieldsToPostUpdate({ ...next.fields, title: next.title, summary: next.summary, bodyHtml: next.bodyHtml }),
            status: outcome.status,
            scheduledAt: outcome.scheduledAt,
            publishedAt: outcome.publishedAt,
          },
        });
        await tx.postRevision.create({
          data: { postId: review.postId, title: next.title, bodyHtml: next.bodyHtml, editorId: guard.id },
        });
      });

      await tellEditorAboutDecision(id);
      return NextResponse.json({ ok: true, decision: "APPROVED" });
    }

    // reject
    const edits = editsFrom(body);
    const reason = body.reason;
    await prisma.$transaction(async (tx) => {
      const review = await tx.postReview.findUnique({ where: { id }, include: { post: true } });
      if (!review || review.status !== "CLAIMED" || review.claimedById !== guard.id) {
        throw await explainClaim(id, guard.id);
      }
      const next = applyEdits(review, edits);

      const locked = await tx.postReview.updateMany({
        where: { id, status: "CLAIMED", claimedById: guard.id },
        data: {
          status: "REJECTED",
          decidedAt: now,
          rejectReason: reason,
          title: next.title,
          summary: next.summary,
          bodyHtml: next.bodyHtml,
          payload: JSON.stringify(next.fields),
        },
      });
      if (locked.count !== 1) throw await explainClaim(id, guard.id);

      // A post that isn't live goes back to the editor as a draft, with the
      // proofreader's corrections in it. A live post is left exactly as it is;
      // the editor picks up the returned version from the review.
      if (!isLiveStatus(review.post.status)) {
        await tx.post.update({
          where: { id: review.postId },
          data: {
            ...fieldsToPostUpdate({ ...next.fields, title: next.title, summary: next.summary, bodyHtml: next.bodyHtml }),
            status: "DRAFT",
          },
        });
        await tx.postRevision.create({
          data: { postId: review.postId, title: next.title, bodyHtml: next.bodyHtml, editorId: guard.id },
        });
      }
    });

    await tellEditorAboutDecision(id);
    return NextResponse.json({ ok: true, decision: "REJECTED" });
  } catch (err) {
    if (err instanceof Conflict) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[proofread] action failed:", err);
    return NextResponse.json({ error: "Something went wrong. Reload the page and try again." }, { status: 500 });
  }
}
