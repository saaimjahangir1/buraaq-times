import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { sendMail } from "./mailer";
import { generateToken } from "./tokens";
import { SITE_URL, SITE_NAME } from "./seo";
import { postHref } from "./types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const BRAND = "#F6A700";
const TZ = "Asia/Karachi";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Today's date in Pakistan time, e.g. "2026-10-08" — one digest per date. */
export function digestDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function prettyDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(now);
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export const confirmUrl = (token: string) => `${SITE_URL}/newsletter/confirm?token=${token}`;
export const unsubscribeUrl = (token: string) => `${SITE_URL}/newsletter/unsubscribe?token=${token}`;
const oneClickUnsubscribeUrl = (token: string) => `${SITE_URL}/api/newsletter/unsubscribe?token=${token}`;

function shell(inner: string, footer: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0b0b0f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0f;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#15151c;border-radius:16px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#e7e7ea;">
<tr><td style="padding:22px 28px;border-bottom:3px solid ${BRAND};">
  <a href="${SITE_URL}" style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;text-decoration:none;">${SITE_NAME}</a>
  <span style="margin-left:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${BRAND};">Daily briefing</span>
</td></tr>
<tr><td style="padding:28px;">${inner}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #2a2a33;font-size:12px;line-height:1.6;color:#8b8b96;">${footer}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="border-radius:999px;background:${BRAND};">
<a href="${href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#111111;text-decoration:none;border-radius:999px;">${label}</a>
</td></tr></table>`;
}

/* ------------------------------------------------------------------ */
/* Sign-up                                                             */
/* ------------------------------------------------------------------ */

/**
 * Creates or refreshes a pending subscription and sends the confirmation
 * email. Always succeeds from the caller's point of view, so the form never
 * reveals whether an address is already subscribed.
 */
export async function requestSubscription(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const existing = await prisma.subscriber.findUnique({ where: { email } });

  if (existing?.status === "ACTIVE") return { alreadyActive: true, devLink: undefined };

  const token = generateToken(24);
  const sub = existing
    ? await prisma.subscriber.update({
        where: { id: existing.id },
        data: { status: "PENDING", token, unsubscribedAt: null },
      })
    : await prisma.subscriber.create({ data: { email, token, status: "PENDING" } });

  const link = confirmUrl(sub.token);
  const { sent } = await sendMail({
    to: email,
    subject: `Confirm your ${SITE_NAME} daily briefing`,
    html: shell(
      `<p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">One click to confirm</p>
<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#c9c9d1;">Someone — hopefully you — asked to get the ${SITE_NAME} daily briefing at <strong style="color:#ffffff;">${escapeHtml(email)}</strong>. Confirm and you'll get one email each morning with the stories we published, only on days we publish.</p>
${button(link, "Yes, subscribe me")}
<p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#8b8b96;">If the button doesn't work, copy this link:<br><a href="${link}" style="color:${BRAND};word-break:break-all;">${link}</a></p>`,
      `Didn't ask for this? Ignore this email and you won't hear from us again.`
    ),
  });
  return { alreadyActive: false, devLink: sent || process.env.NODE_ENV === "production" ? undefined : link };
}

export async function confirmSubscription(token: string) {
  if (!token || token.length < 20) return { ok: false as const };
  const sub = await prisma.subscriber.findUnique({ where: { token } });
  if (!sub || sub.status === "UNSUBSCRIBED") return { ok: false as const };
  if (sub.status !== "ACTIVE") {
    await prisma.subscriber.update({ where: { id: sub.id }, data: { status: "ACTIVE", confirmedAt: new Date() } });
  }
  return { ok: true as const, email: sub.email };
}

export async function unsubscribe(token: string) {
  if (!token || token.length < 20) return { ok: false as const };
  const sub = await prisma.subscriber.findUnique({ where: { token } });
  if (!sub) return { ok: false as const };
  if (sub.status !== "UNSUBSCRIBED") {
    await prisma.subscriber.update({
      where: { id: sub.id },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });
  }
  return { ok: true as const, email: sub.email };
}

/* ------------------------------------------------------------------ */
/* Daily digest                                                        */
/* ------------------------------------------------------------------ */

const MAX_STORIES = 8;
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_WINDOW_MS = 3 * DEFAULT_WINDOW_MS;

type DigestPost = {
  id: string;
  type: string;
  slug: string;
  title: string;
  summary: string;
  featuredImageUrl: string | null;
  category: { name: string } | null;
};

const postSelect = {
  id: true,
  type: true,
  slug: true,
  title: true,
  summary: true,
  featuredImageUrl: true,
  category: { select: { name: true } },
} as const;

/** Stories that went live since the previous digest (24h by default, at most 3 days back). */
async function storiesSince(since: Date, now: Date): Promise<DigestPost[]> {
  return prisma.post.findMany({
    where: {
      OR: [
        { status: "PUBLISHED", publishedAt: { gt: since, lte: now } },
        { status: "SCHEDULED", scheduledAt: { gt: since, lte: now } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: MAX_STORIES,
    select: postSelect,
  });
}

function digestSubject(posts: DigestPost[]) {
  const lead = truncate(posts[0].title, 70);
  return posts.length > 1 ? `${lead} + ${posts.length - 1} more` : lead;
}

export function renderDigest(posts: DigestPost[], token: string | null, now = new Date()) {
  const items = posts
    .map((p, i) => {
      const url = `${SITE_URL}${postHref({ type: p.type as "news" | "article", slug: p.slug })}`;
      const img =
        i === 0 && p.featuredImageUrl
          ? `<a href="${url}"><img src="${p.featuredImageUrl}" alt="" width="544" style="display:block;width:100%;max-width:544px;height:auto;border-radius:12px;margin-bottom:14px;border:0;"></a>`
          : "";
      const label = [p.type === "news" ? "News" : "Article", p.category?.name].filter(Boolean).join(" · ");
      return `<tr><td style="padding:${i === 0 ? "0" : "18px"} 0 18px;${i === 0 ? "" : "border-top:1px solid #2a2a33;"}">
${img}<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${BRAND};">${escapeHtml(label)}</div>
<a href="${url}" style="display:block;margin-top:6px;font-size:${i === 0 ? 21 : 17}px;font-weight:700;line-height:1.3;color:#ffffff;text-decoration:none;">${escapeHtml(p.title)}</a>
<div style="margin-top:6px;font-size:14px;line-height:1.55;color:#b9b9c3;">${escapeHtml(truncate(p.summary, 220))}</div>
<a href="${url}" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:700;color:${BRAND};text-decoration:none;">Read →</a>
</td></tr>`;
    })
    .join("");

  const unsub = token
    ? `You're getting this because you subscribed to the ${SITE_NAME} daily briefing. <a href="${unsubscribeUrl(token)}" style="color:#8b8b96;">Unsubscribe</a>.`
    : `Preview — the real email has an unsubscribe link here.`;

  return shell(
    `<p style="margin:0 0 4px;font-size:13px;color:#8b8b96;">${prettyDate(now)}</p>
<p style="margin:0 0 20px;font-size:20px;font-weight:800;color:#ffffff;">${posts.length === 1 ? "Today's story" : `Today's ${posts.length} stories`}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
${button(SITE_URL, `More on ${SITE_NAME}`)}`,
    unsub
  );
}

/** A pooled SMTP connection for sending many emails in one go. */
function bulkTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    pool: true,
    maxConnections: 2,
  });
}

export type DigestRunResult = {
  status: "SENT" | "SENDING" | "SKIPPED" | "NO_SMTP";
  date: string;
  stories: number;
  sentThisRun: number;
  failedThisRun: number;
  remaining: number;
};

/**
 * Sends today's digest. Safe to call repeatedly (cron, "Send now" button,
 * accidental double runs): each subscriber is claimed before sending, so
 * nobody gets the same digest twice, and a run that hits the time budget
 * simply leaves the rest for the next call.
 */
export async function runDailyDigest({ budgetMs = 45_000 }: { budgetMs?: number } = {}): Promise<DigestRunResult> {
  const started = Date.now();
  const now = new Date();
  const date = digestDateKey(now);

  let issue = await prisma.newsletterIssue.findUnique({ where: { date } });

  if (!issue) {
    const previous = await prisma.newsletterIssue.findFirst({ orderBy: { createdAt: "desc" } });
    const since = previous
      ? new Date(Math.max(previous.createdAt.getTime(), now.getTime() - MAX_WINDOW_MS))
      : new Date(now.getTime() - DEFAULT_WINDOW_MS);
    const posts = await storiesSince(since, now);
    try {
      issue = await prisma.newsletterIssue.create({
        data: {
          date,
          subject: posts.length ? digestSubject(posts) : "(nothing new)",
          postIds: JSON.stringify(posts.map((p) => p.id)),
          status: posts.length ? "SENDING" : "SKIPPED",
          completedAt: posts.length ? null : now,
        },
      });
    } catch {
      // Another run created it a moment ago.
      issue = await prisma.newsletterIssue.findUnique({ where: { date } });
      if (!issue) throw new Error("Could not create today's newsletter issue");
    }
  }

  const postIds: string[] = JSON.parse(issue.postIds || "[]");
  if (issue.status === "SKIPPED" || postIds.length === 0) {
    return { status: "SKIPPED", date, stories: 0, sentThisRun: 0, failedThisRun: 0, remaining: 0 };
  }

  const pendingWhere = { status: "ACTIVE", OR: [{ lastIssueId: null }, { lastIssueId: { not: issue.id } }] };
  if (issue.status === "SENT") {
    return { status: "SENT", date, stories: postIds.length, sentThisRun: 0, failedThisRun: 0, remaining: 0 };
  }

  const transport = bulkTransport();
  if (!transport) {
    console.log("[newsletter] SMTP not configured — digest not sent.");
    return { status: "NO_SMTP", date, stories: postIds.length, sentThisRun: 0, failedThisRun: 0, remaining: await prisma.subscriber.count({ where: pendingWhere }) };
  }

  const unordered = await prisma.post.findMany({ where: { id: { in: postIds } }, select: postSelect });
  // Keep the order the stories were picked in.
  const posts: DigestPost[] = [];
  for (const id of postIds) {
    const p = unordered.find((x) => x.id === id);
    if (p) posts.push(p);
  }
  const from = process.env.SMTP_FROM || `${SITE_NAME} <no-reply@buraaqtimes.example>`;

  let sent = 0;
  let failed = 0;
  // Addresses that failed in this run aren't retried until the next run.
  const failedIds: string[] = [];
  try {
    while (Date.now() - started < budgetMs) {
      const batch = await prisma.subscriber.findMany({
        where: { ...pendingWhere, id: { notIn: failedIds } },
        orderBy: { createdAt: "asc" },
        take: 20,
      });
      if (batch.length === 0) break;

      for (const sub of batch) {
        if (Date.now() - started >= budgetMs) break;
        // Claim first: if another run already took this subscriber, skip them.
        const claimed = await prisma.subscriber.updateMany({
          where: { id: sub.id, status: "ACTIVE", OR: [{ lastIssueId: null }, { lastIssueId: { not: issue.id } }] },
          data: { lastIssueId: issue.id, lastSentAt: new Date() },
        });
        if (claimed.count === 0) continue;

        try {
          await transport.sendMail({
            from,
            to: sub.email,
            subject: issue.subject,
            html: renderDigest(posts, sub.token, now),
            headers: {
              "List-Unsubscribe": `<${oneClickUnsubscribeUrl(sub.token)}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });
          sent += 1;
        } catch (err) {
          failed += 1;
          failedIds.push(sub.id);
          console.error(`[newsletter] send to ${sub.email} failed:`, err instanceof Error ? err.message : err);
          // Hand them back so the next run retries.
          await prisma.subscriber.update({
            where: { id: sub.id },
            data: { lastIssueId: sub.lastIssueId, lastSentAt: sub.lastSentAt },
          });
        }
      }
      // Stop looping on a batch where everything failed (e.g. SMTP is down).
      if (failed > 0 && sent === 0) break;
    }
  } finally {
    transport.close();
  }

  const remaining = await prisma.subscriber.count({ where: pendingWhere });
  await prisma.newsletterIssue.update({
    where: { id: issue.id },
    data: {
      sentCount: { increment: sent },
      failedCount: { increment: failed },
      ...(remaining === 0 ? { status: "SENT", completedAt: new Date() } : {}),
    },
  });

  return { status: remaining === 0 ? "SENT" : "SENDING", date, stories: posts.length, sentThisRun: sent, failedThisRun: failed, remaining };
}

/** Emails a preview of today's digest (or the latest stories) to one address. */
export async function sendDigestPreview(to: string) {
  const now = new Date();
  let posts = await storiesSince(new Date(now.getTime() - DEFAULT_WINDOW_MS), now);
  let note = "";
  if (posts.length === 0) {
    posts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: postSelect,
    });
    note = " (nothing new today — showing the latest stories)";
  }
  if (posts.length === 0) return { sent: false, reason: "There are no published stories yet." };
  const { sent } = await sendMail({
    to,
    subject: `[Preview] ${digestSubject(posts)}`,
    html: renderDigest(posts, null, now),
  });
  return { sent, reason: sent ? `Preview sent to ${to}${note}.` : "SMTP isn't configured, so nothing was sent." };
}
