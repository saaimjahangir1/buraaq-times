// Client-safe pieces split out of lib/auth.ts — no next/headers, no
// server-only imports, so components using "use client" can import from
// here directly without pulling a server-only module into the browser bundle.

export const ROLES = ["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR", "PROOFREADER"] as const;
export type Role = (typeof ROLES)[number];

export const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type UserStatus = (typeof STATUSES)[number];

export type AccessState = "PENDING" | "APPROVED" | "REJECTED" | null;

type AccessUser = { role: string; status: string; proofreaderStatus?: string | null };

/** Writing access (News/Articles in the CMS). null = this account has no writing role. */
export function writerState(u: AccessUser): AccessState {
  if (u.role === "ADMIN") return "APPROVED";
  if (u.role === "PROOFREADER") return null;
  return u.status as AccessState;
}

/**
 * Proofreading access (the /proofread desk). null = never requested.
 * Proofreader-only accounts created before writers could also proofread have
 * no proofreaderStatus yet — their account status is their proofreader status.
 */
export function proofreaderState(u: AccessUser): AccessState {
  if (u.role === "ADMIN") return "APPROVED";
  if (u.proofreaderStatus) return u.proofreaderStatus as AccessState;
  return u.role === "PROOFREADER" ? (u.status as AccessState) : null;
}

export function roleLabel(role: Role) {
  return {
    ADMIN: "Admin",
    NEWS_EDITOR: "News Editor",
    ARTICLE_EDITOR: "Article Editor",
    PROOFREADER: "Proofreader",
  }[role];
}

export function allowedTypeForRole(role: Role): "news" | "article" | "both" | "none" {
  if (role === "NEWS_EDITOR") return "news";
  if (role === "ARTICLE_EDITOR") return "article";
  if (role === "ADMIN") return "both";
  // Proofreaders never create or edit posts through the CMS — they only work
  // on review snapshots through /proofread.
  return "none";
}

export function canAccessType(role: Role, type: "news" | "article") {
  const allowed = allowedTypeForRole(role);
  if (allowed === "none") return false;
  return allowed === "both" || allowed === type;
}
