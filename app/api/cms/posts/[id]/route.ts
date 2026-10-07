import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { notify } from "@/lib/notifications";
import { postFieldsSchema, fieldsToPostUpdate } from "@/lib/post-fields";
import { editorPatchDecision, isOpenReview } from "@/lib/proofread-policy";
import { latestReviewFor, releaseStaleClaims, serializeReviewForEditor } from "@/lib/proofread";

const updateSchema = postFieldsSchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

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

  await releaseStaleClaims();
  const review = serializeReviewForEditor(await latestReviewFor(post.id));
  return NextResponse.json({ post, review });
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

  // Proofreading rules: who may change what, and when.
  await releaseStaleClaims();
  const latest = await latestReviewFor(existing!.id);
  const openReview = latest && isOpenReview(latest.status) ? latest : null;
  const decision = editorPatchDecision({
    role: guard.role,
    postStatus: existing!.status,
    requestedStatus: data.status,
    openReview: openReview ? { status: openReview.status, claimedByName: openReview.claimedBy?.name } : null,
    latestReviewStatus: latest?.status,
  });
  if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: decision.status });

  // A live post an editor archives: only the status changes, never the text.
  if (decision.archiveOnly) {
    const post = await prisma.post.update({ where: { id: params.id }, data: { status: "ARCHIVED" } });
    if (decision.closeReview && latest) {
      await prisma.postReview.updateMany({ where: { id: latest.id, status: "REJECTED" }, data: { status: "DISMISSED" } });
    }
    return NextResponse.json({ post });
  }

  const willPublishNow = data.status === "PUBLISHED" && existing!.status !== "PUBLISHED";

  // Only a waiting review can be closed here — editorPatchDecision already
  // refused if a proofreader has claimed it. The status guard makes this a
  // no-op if someone claimed it in the last few milliseconds.
  if (decision.closeReview && latest) {
    const closed = await prisma.postReview.updateMany({
      where: { id: latest.id, status: { in: ["PENDING", "REJECTED"] } },
      data: { status: latest.status === "PENDING" ? "CANCELLED" : "DISMISSED" },
    });
    if (latest.status === "PENDING" && closed.count === 0) {
      return NextResponse.json(
        { error: "A proofreader just picked this up. Reload the page to see who." },
        { status: 409 }
      );
    }
  }

  const { status: newStatus, scheduledAt, ...fields } = data;
  const post = await prisma.post.update({
    where: { id: params.id },
    data: {
      ...fieldsToPostUpdate(fields),
      ...(newStatus !== undefined && { status: newStatus }),
      ...(newStatus === "SCHEDULED" && scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      ...(willPublishNow && { publishedAt: new Date() }),
      // A post leaving review through an admin save stops being "in review".
      ...(newStatus === undefined && existing!.status === "IN_REVIEW" && { status: "DRAFT" }),
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

  if (guard.role !== "ADMIN") {
    await releaseStaleClaims();
    const claimed = await prisma.postReview.findFirst({
      where: { postId: params.id, status: "CLAIMED" },
      include: { claimedBy: { select: { name: true } } },
    });
    if (claimed) {
      return NextResponse.json(
        { error: `${claimed.claimedBy?.name ?? "A proofreader"} is proofreading this right now, so it can't be deleted.` },
        { status: 409 }
      );
    }
  }

  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
