// Client-safe pieces split out of lib/auth.ts — no next/headers, no
// server-only imports, so components using "use client" can import from
// here directly without pulling a server-only module into the browser bundle.

export const ROLES = ["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR"] as const;
export type Role = (typeof ROLES)[number];

export const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type UserStatus = (typeof STATUSES)[number];

export function roleLabel(role: Role) {
  return { ADMIN: "Admin", NEWS_EDITOR: "News Editor", ARTICLE_EDITOR: "Article Editor" }[role];
}

export function allowedTypeForRole(role: Role): "news" | "article" | "both" {
  if (role === "NEWS_EDITOR") return "news";
  if (role === "ARTICLE_EDITOR") return "article";
  return "both";
}

export function canAccessType(role: Role, type: "news" | "article") {
  const allowed = allowedTypeForRole(role);
  return allowed === "both" || allowed === type;
}
