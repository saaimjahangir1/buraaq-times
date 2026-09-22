import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE_NAME = "bt_vid";
const MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

// Identifies an anonymous public-site visitor across requests, purely to
// make Like/Save idempotent — not analytics, not tied to any account.

// Read-only — safe to call from a Server Component (page.tsx). Next.js
// forbids setting cookies during render, so this never creates one.
export function getVisitorId(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

// Read-or-create — only callable from a Route Handler or Server Action,
// where the response is actually mutable.
export function getOrCreateVisitorId(): string {
  const store = cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = randomUUID();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    // Your server currently has no HTTPS listener (confirmed: nginx is only
    // on port 80) — a Secure cookie would be silently dropped by every
    // browser, breaking Like/Save de-duplication entirely. Flip this back
    // to `process.env.NODE_ENV === "production"` once TLS is set up.
    secure: false,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return id;
}
