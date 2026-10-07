import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { canAccessType } from "@/lib/auth";
import { postFieldsSchema, fieldsToPostUpdate } from "@/lib/post-fields";
import { isLiveStatus } from "@/lib/proofread-policy";
import {
  emailProofreadersAboutSubmission,
  latestReviewFor,
  releaseStaleClaims,
  serializeReviewForEditor,
} from "@/lib/proofread";

// Emailing every proofreader can take a few seconds.
export const maxDuration = 30;

const submitSchema = postFieldsSchema.extend({
  title: z.string().min(3, "Add a headline of at least 3 characters"),
  summary: z.string().min(3, "Add a summary of at least 3 characters"),
  bodyHtml: z.string().min(1, "The article body is empty"),
  targetStatus: z.enum(["PUBLISHED", "SCHEDULED"]).default("PUBLISHED"),
  scheduledAt: z.string().datetime().optional().nullable(),
});

async function loadOwnedPost(id: string, user: { id: string; role: string }) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (user.role !== "ADMIN" && post.authorId !== user.id) {
    return { error: NextResponse.json({ error: "Not your post" }, { status: 403 }) };
  }
  return { post };
}

/** POST — submit (or update a waiting submission) for proofreading. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const { error, post } = await loadOwnedPost(params.id, guard);
  if (error) return error;
  if (!canAccessType(guard.role, post!.type as "news" | "article")) {
    return NextResponse.json({ error: `Not allowed to publish ${post!.type}` }, { status: 403 });
  }

  await releaseStaleClaims();
  const latest = await latestReviewFor(post!.id);
  if (latest?.status === "CLAIMED") {
    return NextResponse.json(
      { error: `${latest.claimedBy?.name ?? "A proofreader"} is already proofreading this, so it can't be changed right now.` },
      { status: 409 }
    );
  }

  const parsed = submitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { targetStatus, scheduledAt, title, summary, bodyHtml, ...otherFields } = parsed.data;
  if (targetStatus === "SCHEDULED" && !scheduledAt) {
    return NextResponse.json({ error: "Pick a date and time to schedule it for." }, { status: 400 });
  }

  const live = isLiveStatus(post!.status);
  const snapshot = {
    title,
    summary,
    bodyHtml,
    payload: JSON.stringify(otherFields),
    targetStatus,
    scheduledAt: targetStatus === "SCHEDULED" && scheduledAt ? new Date(scheduledAt) : null,
  };

  let reviewId: string;
  let isNewSubmission = false;

  if (latest?.status === "PENDING") {
    // Still unclaimed: replace what's waiting. The status condition makes this
    // fail cleanly if a proofreader claimed it a moment ago.
    const updated = await prisma.postReview.updateMany({
      where: { id: latest.id, status: "PENDING" },
      data: snapshot,
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { error: "A proofreader just picked this up, so it can't be changed right now. Reload to see who." },
        { status: 409 }
      );
    }
    reviewId = latest.id;
  } else {
    const created = await prisma.postReview.create({
      data: { ...snapshot, postId: post!.id, submittedById: guard.id, isUpdate: live },
    });
    reviewId = created.id;
    isNewSubmission = true;
  }

  // A post that isn't live yet keeps its latest text on the Post row too, so
  // it shows up correctly in the CMS lists. A live post is left untouched —
  // readers keep seeing the current version until a proofreader approves.
  if (!live) {
    await prisma.post.update({
      where: { id: post!.id },
      data: {
        ...fieldsToPostUpdate({ ...otherFields, title, summary, bodyHtml }),
        status: "IN_REVIEW",
      },
    });
    await prisma.postRevision.create({
      data: { postId: post!.id, title, bodyHtml, editorId: guard.id },
    });
  }

  const emailed = isNewSubmission ? await emailProofreadersAboutSubmission(reviewId) : { sent: 0 };

  return NextResponse.json({
    ok: true,
    postStatus: live ? post!.status : "IN_REVIEW",
    review: serializeReviewForEditor(await latestReviewFor(post!.id)),
    proofreadersEmailed: emailed.sent,
  });
}

/**
 * DELETE — take a waiting submission back (PENDING → CANCELLED), or discard a
 * returned edit of a live post (REJECTED → DISMISSED).
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  const { error, post } = await loadOwnedPost(params.id, guard);
  if (error) return error;

  await releaseStaleClaims();
  const latest = await latestReviewFor(post!.id);

  if (latest?.status === "PENDING") {
    const updated = await prisma.postReview.updateMany({
      where: { id: latest.id, status: "PENDING" },
      data: { status: "CANCELLED", decidedAt: new Date() },
    });
    if (updated.count === 0) {
      return NextResponse.json(
        { error: "A proofreader just picked this up, so it can't be withdrawn. Reload to see who." },
        { status: 409 }
      );
    }
    if (post!.status === "IN_REVIEW") {
      await prisma.post.update({ where: { id: post!.id }, data: { status: "DRAFT" } });
    }
  } else if (latest?.status === "REJECTED") {
    await prisma.postReview.update({ where: { id: latest.id }, data: { status: "DISMISSED" } });
  } else if (latest?.status === "CLAIMED") {
    return NextResponse.json(
      { error: `${latest.claimedBy?.name ?? "A proofreader"} is proofreading this right now, so it can't be withdrawn.` },
      { status: 409 }
    );
  } else {
    return NextResponse.json({ error: "Nothing is waiting for proofreading." }, { status: 400 });
  }

  const fresh = await prisma.post.findUnique({ where: { id: post!.id }, select: { status: true } });
  return NextResponse.json({ ok: true, postStatus: fresh?.status ?? post!.status });
}
