import "server-only";
import { prisma } from "./prisma";
import { sendMail } from "./mailer";
import { notify } from "./notifications";
import { SITE_URL } from "./seo";
import { postHref } from "./types";
import { CLAIM_TTL_MS, escapeHtml, typeLabel } from "./proofread-policy";
import { parseStoredFields } from "./post-fields";

/* ------------------------------------------------------------------ */
/* Claims                                                              */
/* ------------------------------------------------------------------ */

/**
 * Puts claims back in the queue after 24h without a save. Runs lazily at the
 * start of any request that reads the queue — the same "no cron job" approach
 * public-data.ts uses for scheduled posts.
 */
export async function releaseStaleClaims() {
  const cutoff = new Date(Date.now() - CLAIM_TTL_MS);
  try {
    await prisma.postReview.updateMany({
      where: { status: "CLAIMED", lastActivityAt: { lt: cutoff } },
      data: { status: "PENDING", claimedById: null, claimedAt: null, lastActivityAt: null },
    });
  } catch (err) {
    console.error("[proofread] releaseStaleClaims failed:", err);
  }
}

/** The newest review of a post, with names — what the editor sees. */
export async function latestReviewFor(postId: string) {
  return prisma.postReview.findFirst({
    where: { postId },
    orderBy: { createdAt: "desc" },
    include: {
      claimedBy: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
    },
  });
}

/** Shape the editor needs to show review banners and load pending changes. */
export function serializeReviewForEditor(review: Awaited<ReturnType<typeof latestReviewFor>>) {
  if (!review) return null;
  return {
    id: review.id,
    status: review.status,
    isUpdate: review.isUpdate,
    targetStatus: review.targetStatus,
    scheduledAt: review.scheduledAt,
    title: review.title,
    summary: review.summary,
    bodyHtml: review.bodyHtml,
    fields: parseStoredFields(review.payload),
    rejectReason: review.rejectReason,
    claimedBy: review.claimedBy?.name ?? null,
    claimedAt: review.claimedAt,
    submittedBy: review.submittedBy.name,
    createdAt: review.createdAt,
    decidedAt: review.decidedAt,
  };
}

export function editLinkFor(post: { id: string; type: string }) {
  return `/cms/${post.type === "news" ? "news" : "articles"}/${post.id}/edit`;
}

/* ------------------------------------------------------------------ */
/* Email building blocks                                               */
/* ------------------------------------------------------------------ */

const BRAND = "#F6A700";
const PKT: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Karachi",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
};

function pkt(date: Date) {
  return `${date.toLocaleString("en-GB", PKT)} PKT`;
}

function emailShell(inner: string, footer: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0b0b0f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0f;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#15151c;border-radius:16px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#e7e7ea;">
<tr><td style="padding:22px 28px;border-bottom:3px solid ${BRAND};">
  <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Buraaq Times</span>
  <span style="margin-left:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${BRAND};">Proofreading desk</span>
</td></tr>
<tr><td style="padding:28px;">${inner}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #2a2a33;font-size:12px;line-height:1.5;color:#8b8b96;">${footer}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr><td style="border-radius:999px;background:${BRAND};">
<a href="${href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#111111;text-decoration:none;border-radius:999px;">${label}</a>
</td></tr></table>`;
}

function truncate(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/* ------------------------------------------------------------------ */
/* 1. New submission → every approved proofreader                      */
/* ------------------------------------------------------------------ */

export async function emailProofreadersAboutSubmission(reviewId: string) {
  try {
    const [review, proofreaders, waiting] = await Promise.all([
      prisma.postReview.findUnique({
        where: { id: reviewId },
        include: { post: { select: { type: true } }, submittedBy: { select: { name: true } } },
      }),
      prisma.user.findMany({
        where: { role: "PROOFREADER", status: "APPROVED", emailVerified: true },
        select: { name: true, email: true },
      }),
      prisma.postReview.findMany({
        where: { status: { in: ["PENDING", "CLAIMED"] } },
        orderBy: { createdAt: "asc" },
        take: 25,
        include: {
          post: { select: { type: true } },
          submittedBy: { select: { name: true } },
          claimedBy: { select: { name: true } },
        },
      }),
    ]);
    if (!review || proofreaders.length === 0) return { sent: 0 };

    const pendingCount = waiting.filter((w) => w.status === "PENDING").length;
    const dashboard = `${SITE_URL}/proofread`;
    const kind = typeLabel(review.post.type);

    const newCard = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:#1d1d26;border-radius:12px;border-left:4px solid ${BRAND};">
<tr><td style="padding:16px 18px;">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${BRAND};">New ${kind.toLowerCase()}${review.isUpdate ? " · edit to a live post" : ""}</div>
  <div style="margin-top:6px;font-size:18px;font-weight:700;color:#ffffff;line-height:1.3;">${escapeHtml(review.title)}</div>
  <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#b9b9c3;">${escapeHtml(truncate(review.summary, 180))}</div>
  <div style="margin-top:10px;font-size:12px;color:#8b8b96;">By ${escapeHtml(review.submittedBy.name)} · ${pkt(review.createdAt)}</div>
</td></tr></table>`;

    const others = waiting.filter((w) => w.id !== review.id);
    const list = others.length
      ? `<p style="margin:22px 0 8px;font-size:13px;font-weight:700;color:#ffffff;">Also in the queue</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
${others
  .map(
    (w) => `<tr>
  <td style="padding:8px 0;border-top:1px solid #2a2a33;color:#e7e7ea;">
    <span style="color:${BRAND};font-weight:700;">${typeLabel(w.post.type)}</span> · ${escapeHtml(truncate(w.title, 80))}
    <div style="font-size:12px;color:#8b8b96;">by ${escapeHtml(w.submittedBy.name)}</div>
  </td>
  <td align="right" style="padding:8px 0 8px 12px;border-top:1px solid #2a2a33;font-size:12px;white-space:nowrap;color:${
    w.status === "CLAIMED" ? "#8b8b96" : "#7ee2c4"
  };">${w.status === "CLAIMED" ? `🔒 ${escapeHtml(w.claimedBy?.name ?? "Claimed")}` : "Waiting"}</td>
</tr>`
  )
  .join("")}
</table>`
      : "";

    const subject = `Proofread needed: “${truncate(review.title, 70)}”${pendingCount > 1 ? ` (+${pendingCount - 1} more waiting)` : ""}`;
    const footer = `You're getting this because you're a Buraaq Times proofreader. The first proofreader to claim an item locks it for everyone else; claims are released automatically after 24 hours without a save.`;

    const htmlFor = (name: string) =>
      emailShell(
        `<p style="margin:0;font-size:16px;color:#ffffff;">Hi ${escapeHtml(name.split(" ")[0] || name)},</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#c9c9d1;">
${pendingCount === 1 ? "A piece is" : `<strong style="color:#ffffff;">${pendingCount} pieces</strong> are`} waiting for approval on the proofreading desk.
</p>
${newCard}
${list}
${button(dashboard, "Open the proofreading dashboard")}
<p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#8b8b96;">Sign in with your proofreader account. If the button doesn't work, copy this link:<br>
<a href="${dashboard}" style="color:${BRAND};word-break:break-all;">${dashboard}</a></p>`,
        footer
      );

    // Small batches: friendlier to SMTP providers than firing everything at once.
    let sent = 0;
    for (let i = 0; i < proofreaders.length; i += 3) {
      const batch = proofreaders.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map((p) => sendMail({ to: p.email, subject, html: htmlFor(p.name) }))
      );
      results.forEach((r, j) => {
        if (r.status === "fulfilled") sent += 1;
        else console.error(`[proofread] email to ${batch[j].email} failed:`, r.reason);
      });
    }
    return { sent };
  } catch (err) {
    // Never let email problems block a submission.
    console.error("[proofread] emailProofreadersAboutSubmission failed:", err);
    return { sent: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* 2. Decision → the editor who submitted                              */
/* ------------------------------------------------------------------ */

export async function tellEditorAboutDecision(reviewId: string) {
  try {
    const review = await prisma.postReview.findUnique({
      where: { id: reviewId },
      include: {
        post: { select: { id: true, type: true, slug: true, status: true, scheduledAt: true } },
        submittedBy: { select: { id: true, name: true, email: true } },
        claimedBy: { select: { name: true } },
      },
    });
    if (!review) return;

    const proofreader = review.claimedBy?.name ?? "A proofreader";
    const editUrl = `${SITE_URL}${editLinkFor(review.post)}`;
    const footer = "You're getting this because you submitted this piece for proofreading on Buraaq Times.";
    const title = escapeHtml(review.title);

    if (review.status === "APPROVED") {
      const scheduled = review.post.status === "SCHEDULED" && review.post.scheduledAt;
      const liveUrl = `${SITE_URL}${postHref({ type: review.post.type as "news" | "article", slug: review.post.slug })}`;
      const headline = scheduled ? "Approved and scheduled" : "Approved and live";
      const line = scheduled
        ? `will go live on ${pkt(review.post.scheduledAt as Date)}`
        : review.isUpdate
        ? "— your changes are now live"
        : "is now live on Buraaq Times";

      await notify(
        review.submittedBy.id,
        "PUBLISH_CONFIRMATION",
        scheduled ? "Approved and scheduled" : "Your post is live",
        `${proofreader} approved "${review.title}".`,
        editLinkFor(review.post)
      );
      await sendMail({
        to: review.submittedBy.email,
        subject: `${headline}: “${truncate(review.title, 70)}”`,
        html: emailShell(
          `<p style="margin:0;font-size:16px;color:#ffffff;">Hi ${escapeHtml(review.submittedBy.name.split(" ")[0])},</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#c9c9d1;"><strong style="color:#ffffff;">${escapeHtml(proofreader)}</strong> proofread and approved <strong style="color:#ffffff;">“${title}”</strong>, which ${line}.</p>
${button(scheduled ? editUrl : liveUrl, scheduled ? "Open in the CMS" : "View it live")}`,
          footer
        ),
      });
      return;
    }

    if (review.status === "REJECTED") {
      const reason = escapeHtml(review.rejectReason ?? "").replace(/\n/g, "<br>");
      await notify(
        review.submittedBy.id,
        "REVIEW",
        "Returned by proofreader",
        `${proofreader} returned "${review.title}": ${truncate(review.rejectReason ?? "", 140)}`,
        editLinkFor(review.post)
      );
      await sendMail({
        to: review.submittedBy.email,
        subject: `Changes needed: “${truncate(review.title, 70)}”`,
        html: emailShell(
          `<p style="margin:0;font-size:16px;color:#ffffff;">Hi ${escapeHtml(review.submittedBy.name.split(" ")[0])},</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#c9c9d1;"><strong style="color:#ffffff;">${escapeHtml(proofreader)}</strong> returned <strong style="color:#ffffff;">“${title}”</strong>${review.isUpdate ? " — the live version hasn't changed" : ""}. Their note:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#1d1d26;border-radius:12px;border-left:4px solid #f87171;">
<tr><td style="padding:14px 18px;font-size:14px;line-height:1.6;color:#e7e7ea;">${reason}</td></tr></table>
<p style="margin:0;font-size:14px;line-height:1.6;color:#c9c9d1;">Any corrections they made are already in your copy. Fix the rest and submit it again.</p>
${button(editUrl, "Open in the CMS")}`,
          footer
        ),
      });
    }
  } catch (err) {
    console.error("[proofread] tellEditorAboutDecision failed:", err);
  }
}

/* ------------------------------------------------------------------ */
/* 3. Account approved → the new proofreader                           */
/* ------------------------------------------------------------------ */

export async function emailProofreaderApproved(user: { name: string; email: string }) {
  try {
    const login = `${SITE_URL}/proofread/login`;
    await sendMail({
      to: user.email,
      subject: "You're in: Buraaq Times proofreading desk",
      html: emailShell(
        `<p style="margin:0;font-size:16px;color:#ffffff;">Hi ${escapeHtml(user.name.split(" ")[0])},</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#c9c9d1;">An admin approved your proofreader account. From now on you'll get an email whenever a piece is waiting for approval.</p>
${button(login, "Sign in to the desk")}
<p style="margin:8px 0 0;font-size:12px;color:#8b8b96;">Bookmark this link: <a href="${login}" style="color:${BRAND};">${login}</a></p>`,
        "Buraaq Times proofreading desk"
      ),
    });
  } catch (err) {
    console.error("[proofread] emailProofreaderApproved failed:", err);
  }
}
