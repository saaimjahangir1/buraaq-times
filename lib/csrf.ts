import "server-only";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE, CSRF_HEADER } from "./csrf-constants";

export { CSRF_COOKIE, CSRF_HEADER };

export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/** Sets the CSRF cookie — call alongside setting the session cookie on login. Not httpOnly: the client JS must be able to read it to echo it back in the header. */
export function setCsrfCookie(res: NextResponse, token: string) {
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearCsrfCookie(res: NextResponse) {
  res.cookies.set(CSRF_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Double-submit check: the header must match the cookie. An attacker's
 * cross-site form can make the browser send the cookie, but can't read it
 * to also set the matching header — so a mismatch (or missing header)
 * fails. Only meaningful for state-changing methods; GET is always fine.
 */
export function verifyCsrf(req: NextRequest): boolean {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}
