// Pure rules for the proofreading workflow — no database, no Next.js imports,
// so they're safe to use from both API routes and client components, and easy
// to unit-test.

export const REVIEW_OPEN = ["PENDING", "CLAIMED"] as const;
export type ReviewStatus = "PENDING" | "CLAIMED" | "APPROVED" | "REJECTED" | "CANCELLED" | "DISMISSED";

/** A claim is released automatically after this long without a save. */
export const CLAIM_TTL_HOURS = 24;
export const CLAIM_TTL_MS = CLAIM_TTL_HOURS * 60 * 60 * 1000;

/** "Live" = already approved for the public site (scheduled posts count: their schedule was approved). */
export function isLiveStatus(status: string): boolean {
  return status === "PUBLISHED" || status === "SCHEDULED";
}

export function isOpenReview(status: string | null | undefined): boolean {
  return status === "PENDING" || status === "CLAIMED";
}

/**
 * For a post that is already live, the editor works on the review snapshot
 * (their pending or returned changes) rather than the live version.
 * For a post that isn't live, the Post row itself always holds the latest text.
 */
export function editorShouldLoadSnapshot(postStatus: string, reviewStatus: string | null | undefined): boolean {
  if (!isLiveStatus(postStatus)) return false;
  return reviewStatus === "PENDING" || reviewStatus === "CLAIMED" || reviewStatus === "REJECTED";
}

export type PatchDecision =
  | { ok: true; archiveOnly: boolean; closeReview: boolean }
  | { ok: false; status: number; error: string };

/**
 * What a direct save (PATCH /api/cms/posts/[id]) is allowed to do.
 * Non-admins can only publish through proofreading; admins may bypass it,
 * which cancels a waiting review (but never one a proofreader is working on).
 */
export function editorPatchDecision(input: {
  role: string;
  postStatus: string;
  requestedStatus?: string;
  openReview?: { status: string; claimedByName?: string | null } | null;
  latestReviewStatus?: string | null;
}): PatchDecision {
  const { role, postStatus, requestedStatus, openReview, latestReviewStatus } = input;

  if (openReview?.status === "CLAIMED") {
    return {
      ok: false,
      status: 409,
      error: `${openReview.claimedByName || "A proofreader"} is proofreading this right now. You can edit it again once they approve, reject or release it.`,
    };
  }

  if (role === "ADMIN") {
    // Admin edits supersede a waiting submission or a returned (rejected) one.
    const closeReview = openReview?.status === "PENDING" || latestReviewStatus === "REJECTED";
    return { ok: true, archiveOnly: false, closeReview };
  }

  if (postStatus === "IN_REVIEW" || openReview?.status === "PENDING") {
    return {
      ok: false,
      status: 409,
      error: "This is waiting for a proofreader. Use “Update submission” to change it, or withdraw it first.",
    };
  }

  if (requestedStatus === "PUBLISHED" || requestedStatus === "SCHEDULED") {
    return {
      ok: false,
      status: 403,
      error: "Publishing goes through proofreading — use “Submit for proofreading” instead.",
    };
  }

  if (isLiveStatus(postStatus)) {
    if (requestedStatus === "ARCHIVED") return { ok: true, archiveOnly: true, closeReview: latestReviewStatus === "REJECTED" };
    return {
      ok: false,
      status: 409,
      error: "This post is live. Changes to it must be proofread — use “Submit changes for proofreading”.",
    };
  }

  return { ok: true, archiveOnly: false, closeReview: false };
}

/** Approval outcome for the post's status and publish date. */
export function approvalOutcome(input: {
  postStatus: string;
  postPublishedAt: Date | null;
  targetStatus: string;
  scheduledAt: Date | null;
  now: Date;
}): { status: "PUBLISHED" | "SCHEDULED"; scheduledAt: Date | null; publishedAt: Date | null } {
  const { postStatus, postPublishedAt, targetStatus, scheduledAt, now } = input;
  if (targetStatus === "SCHEDULED" && scheduledAt) {
    return { status: "SCHEDULED", scheduledAt, publishedAt: postPublishedAt };
  }
  return {
    status: "PUBLISHED",
    scheduledAt: null,
    // Keep the original publish date when approving an edit to a live post.
    publishedAt: postStatus === "PUBLISHED" && postPublishedAt ? postPublishedAt : now,
  };
}

export function claimExpiresAt(lastActivityAt: Date | string | null | undefined): Date | null {
  if (!lastActivityAt) return null;
  return new Date(new Date(lastActivityAt).getTime() + CLAIM_TTL_MS);
}

export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(date).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function hoursLeft(until: Date | string | null, now: Date = new Date()): string {
  if (!until) return "";
  const ms = new Date(until).getTime() - now.getTime();
  if (ms <= 0) return "expiring now";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.round(ms / 60_000))} min left`;
}

export function typeLabel(type: string): string {
  return type === "news" ? "News" : "Article";
}

/** Escapes user text (titles, rejection notes) before it goes into an HTML email. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}
