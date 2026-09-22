import "server-only";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, Role, UserStatus } from "./auth";
import { generateCsrfToken, setCsrfCookie } from "./csrf";

export async function issueSession(
  user: { id: string; name: string; email: string; role: string; status: string },
  remember: boolean,
  body: Record<string, unknown> = {}
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
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
  });
  setCsrfCookie(res, generateCsrfToken());
  return res;
}
