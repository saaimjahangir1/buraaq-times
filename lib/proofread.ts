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
      // Back in the queue: the reminder clock starts again from now.
      data: { status: "PENDING", claimedById: null, claimedAt: null, lastActivityAt: null, remindedAt: new Date() },
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

function emailShell(inner: string, footer: string, label = "Proofreading desk") {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0b0b0f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0f;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#15151c;border-radius:16px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#e7e7ea;">
<tr><td style="padding:22px 28px;border-bottom:3px solid ${BRAND};">
  <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Buraaq Times</span>
  <span style="margin-left:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${BRAND};">${label}</span>
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

/**
 * Who gets "waiting for proofreading" emails: everyone who can use the
 * proofreading desk — admins, proofreader-only accounts (including ones an
 * admin switched to "proofreader only"), and writers who also proofread —
 * as long as their email address is verified. The person who submitted the
 * piece is left out, since they can't proofread their own work.
 */
export function proofreadEmailRecipientsWhere(excludeUserId?: string) {
  return {
    emailVerified: true,
    ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    OR: [
      { role: "ADMIN" },
      { proofreaderStatus: "APPROVED" },
      { role: "PROOFREADER", status: "APPROVED", proofreaderStatus: null },
    ],
  };
}

export async function emailProofreadersAboutSubmission(reviewId: string) {
  try {
    const submission = await prisma.postReview.findUnique({ where: { id: reviewId }, select: { submittedById: true } });
    if (!submission) return { sent: 0 };
    const [review, proofreaders, waiting] = await Promise.all([
      prisma.postReview.findUnique({
        where: { id: reviewId },
        include: { post: { select: { type: true } }, submittedBy: { select: { name: true } } },
      }),
      prisma.user.findMany({
        where: proofreadEmailRecipientsWhere(submission.submittedById),
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
    const footer = `You're getting this because you can proofread on Buraaq Times. The first proofreader to claim an item locks it for everyone else; claims are released automatically after 24 hours without a save.`;

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

export async function emailWriterApproved(user: { name: string; email: string; role: string }) {
  try {
    const login = `${SITE_URL}/cms/login`;
    const kind = user.role === "NEWS_EDITOR" ? "news" : user.role === "ARTICLE_EDITOR" ? "articles" : "news and articles";
    await sendMail({
      to: user.email,
      subject: "You can now write for Buraaq Times",
      html: emailShell(
        `<p style="margin:0;font-size:16px;color:#ffffff;">Hi ${escapeHtml(user.name.split(" ")[0])},</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#c9c9d1;">An admin approved your writer access. You can now write ${kind} in the CMS and submit them for proofreading. Sign in with the same email and password you already use.</p>
${button(login, "Open the CMS")}`,
        "Buraaq Times editorial CMS",
        "Editorial CMS"
      ),
    });
  } catch (err) {
    console.error("[proofread] emailWriterApproved failed:", err);
  }
}

/** Tells every admin (in the CMS bell) that someone asked for access. */
export async function notifyAdminsOfRequest(title: string, body: string) {
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.all(admins.map((a) => notify(a.id, "ACCOUNT", title, body, "/cms/users")));
  } catch (err) {
    console.error("[proofread] notifyAdminsOfRequest failed:", err);
  }
}

export async function emailProofreaderApproved(user: { name: string; email: string }) {
  try {
    const login = `${SITE_URL}/proofread/login`;
    await sendMail({
      to: user.email,
      subject: "You're in: Buraaq Times proofreading desk",
      html: emailShell(
        `<p style="margin:0;font-size:16px;color:#ffffff;">Hi ${escapeHtml(user.name.split(" ")[0])},</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#c9c9d1;">An admin approved your proofreader access. From now on you'll get an email whenever a piece is waiting for approval. Sign in with the same email and password you already use.</p>
${button(login, "Sign in to the desk")}
<p style="margin:8px 0 0;font-size:12px;color:#8b8b96;">Bookmark this link: <a href="${login}" style="color:${BRAND};">${login}</a></p>`,
        "Buraaq Times proofreading desk"
      ),
    });
  } catch (err) {
    console.error("[proofread] emailProofreaderApproved failed:", err);
  }
}

/* ------------------------------------------------------------------ */
/* Reminders: pieces nobody has claimed                                */
/* ------------------------------------------------------------------ */

/** Hours between "still waiting" reminders (PROOFREAD_REMINDER_HOURS, default 4). */
export function reminderIntervalHours() {
  const h = Number(process.env.PROOFREAD_REMINDER_HOURS);
  return Number.isFinite(h) && h >= 1 ? h : 4;
}

function waitedFor(from: Date, now: Date) {
  const h = Math.floor((now.getTime() - from.getTime()) / 3_600_000);
  if (h < 1) return "under an hour";
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${Math.floor(h / 24)} days`;
}

/**
 * Called every 15 minutes by the server's scheduler (see
 * /api/cron/proofread-reminders). When any unclaimed piece has waited
 * `reminderIntervalHours()` since it was submitted (or since its last
 * reminder), every proofreader and admin gets ONE email listing all unclaimed
 * pieces — not one email per piece — and every listed piece's clock restarts.
 * Safe to run from several places at once: each piece's reminder slot is
 * taken with a conditional update, so nobody gets duplicates.
 */
export async function sendProofreadReminders(now: Date = new Date()) {
  await releaseStaleClaims();
  const cutoff = new Date(now.getTime() - reminderIntervalHours() * 3_600_000);
  const dueWhere = {
    status: "PENDING",
    OR: [{ remindedAt: null, createdAt: { lte: cutoff } }, { remindedAt: { lte: cutoff } }],
  };

  const due = await prisma.postReview.findMany({ where: dueWhere, select: { id: true, remindedAt: true } });
  if (due.length === 0) return { due: 0, listed: 0, sent: 0 };

  // Take the reminder slot for each due piece. If another run got there
  // first, its remindedAt has already moved on and this update matches nothing.
  let claimed = 0;
  for (const d of due) {
    const r = await prisma.postReview.updateMany({
      where: { id: d.id, status: "PENDING", remindedAt: d.remindedAt },
      data: { remindedAt: now },
    });
    claimed += r.count;
  }
  if (claimed === 0) return { due: due.length, listed: 0, sent: 0 };

  // List everything still waiting, and restart the clock on the rest too, so
  // reminders arrive as one email every few hours instead of piece by piece.
  const waiting = await prisma.postReview.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { post: { select: { type: true } }, submittedBy: { select: { name: true } } },
  });
  await prisma.postReview.updateMany({
    where: { status: "PENDING", id: { in: waiting.map((w) => w.id) } },
    data: { remindedAt: now },
  });
  const beingProofread = await prisma.postReview.count({ where: { status: "CLAIMED" } });

  const recipients = await prisma.user.findMany({
    where: proofreadEmailRecipientsWhere(),
    select: { id: true, name: true, email: true },
  });

  const dashboard = `${SITE_URL}/proofread`;
  const footer = `You're getting this because you can proofread on Buraaq Times. Reminders go out every ${reminderIntervalHours()} hours while something is waiting and nobody has claimed it.`;

  const row = (w: (typeof waiting)[number]) => `<tr>
  <td style="padding:10px 0;border-top:1px solid #2a2a33;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${BRAND};">${typeLabel(w.post.type)}${
      w.isUpdate ? " · edit to a live post" : ""
    }</div>
    <div style="margin-top:3px;font-size:15px;font-weight:700;color:#ffffff;line-height:1.35;">${escapeHtml(truncate(w.title, 110))}</div>
    <div style="margin-top:3px;font-size:12px;color:#8b8b96;">by ${escapeHtml(w.submittedBy.name)}${
      w.targetStatus === "SCHEDULED" && w.scheduledAt
        ? ` · <span style="color:#f5c26b;">meant to go live ${pkt(w.scheduledAt)}</span>`
        : ""
    }</div>
  </td>
  <td align="right" valign="top" style="padding:10px 0 10px 12px;border-top:1px solid #2a2a33;font-size:12px;white-space:nowrap;color:#f5c26b;">waiting ${waitedFor(
    w.createdAt,
    now
  )}</td>
</tr>`;

  let sent = 0;
  for (const person of recipients) {
    // Nobody is reminded about their own submissions — they can't claim them.
    const mine = waiting.filter((w) => w.submittedById !== person.id);
    if (mine.length === 0) continue;
    const subject =
      mine.length === 1
        ? `Reminder: “${truncate(mine[0].title, 60)}” is still waiting for a proofreader`
        : `Reminder: ${mine.length} pieces are still waiting for a proofreader`;
    const html = emailShell(
      `<p style="margin:0;font-size:16px;color:#ffffff;">Hi ${escapeHtml(person.name.split(" ")[0] || person.name)},</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#c9c9d1;">
${mine.length === 1 ? "This piece hasn't" : `These <strong style="color:#ffffff;">${mine.length} pieces</strong> haven't`} been claimed yet, so ${
        mine.length === 1 ? "it can't" : "they can't"
      } go live until someone proofreads ${mine.length === 1 ? "it" : "them"}.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;">${mine.map(row).join("")}</table>
${
  beingProofread > 0
    ? `<p style="margin:14px 0 0;font-size:12px;color:#8b8b96;">${beingProofread} other piece${beingProofread === 1 ? " is" : "s are"} already being proofread.</p>`
    : ""
}
${button(dashboard, "Claim one on the proofreading desk")}
<p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#8b8b96;">If the button doesn't work, copy this link:<br>
<a href="${dashboard}" style="color:${BRAND};word-break:break-all;">${dashboard}</a></p>`,
      footer
    );
    try {
      await sendMail({ to: person.email, subject, html });
      sent += 1;
    } catch (err) {
      console.error(`[proofread] reminder to ${person.email} failed:`, err);
    }
  }
  return { due: due.length, listed: waiting.length, sent };
}
