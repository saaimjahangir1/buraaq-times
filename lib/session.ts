import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieName, Role, SessionArea, UserStatus } from "./auth";
import { clearCsrfCookie, generateCsrfToken, setCsrfCookie } from "./csrf";

export async function issueSession(
  user: { id: string; name: string; email: string; role: string; status: string },
  remember: boolean,
  body: Record<string, unknown> = {},
  area: SessionArea = "cms"
) {
  const token = await createSessionToken(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      status: user.status as UserStatus,
    },
    remember
  );

  const res = NextResponse.json({ ok: true, role: user.role, status: user.status, ...body });
  // Only this area's cookie: signing in to the desk doesn't sign you in to the CMS, and vice versa.
  res.cookies.set(sessionCookieName(area), token, {
    httpOnly: true,
    // No HTTPS on this VPS yet — a Secure cookie would be silently
    // dropped by every browser, breaking login entirely (this exact bug).
    // Flip back to `process.env.NODE_ENV === "production"` once TLS is
    // set up (moving to Vercel gives this automatically).
    // VERCEL_ENV is set automatically only on real Vercel deployments
    // (guaranteed HTTPS there). NODE_ENV alone isn't a safe signal — this
    // VPS also runs in "production" mode via `next start`, with no TLS.
    secure: process.env.VERCEL_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
  });
  setCsrfCookie(res, generateCsrfToken());
  return res;
}

/**
 * Signs out of one area only. The CSRF cookie is shared by both areas, so it's
 * kept while the person is still signed in to the other one.
 */
export function clearSession(req: NextRequest, res: NextResponse, area: SessionArea) {
  res.cookies.set(sessionCookieName(area), "", { path: "/", maxAge: 0 });
  const other: SessionArea = area === "desk" ? "cms" : "desk";
  if (!req.cookies.get(sessionCookieName(other))?.value) clearCsrfCookie(res);
  return res;
}
