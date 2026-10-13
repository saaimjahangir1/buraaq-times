import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export * from "./auth-shared";
import type { Role, UserStatus } from "./auth-shared";

// Two separate sign-ins: the editorial CMS and the proofreading desk each have
// their own cookie, so signing in or out of one never affects the other — even
// for a person who has both kinds of access.
export const SESSION_COOKIE = "bt_session"; // editorial CMS
export const DESK_SESSION_COOKIE = "bt_desk_session"; // proofreading desk
export type SessionArea = "cms" | "desk";

export function sessionCookieName(area: SessionArea = "cms") {
  return area === "desk" ? DESK_SESSION_COOKIE : SESSION_COOKIE;
}

export function parseArea(value: unknown): SessionArea {
  return value === "desk" ? "desk" : "cms";
}

export interface SessionPayload {
  sub: string; // user id
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload, remember: boolean) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "1d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** The signed-in user for one area (the CMS by default, or the proofreading desk). */
export async function getSession(area: SessionArea = "cms"): Promise<SessionPayload | null> {
  const token = cookies().get(sessionCookieName(area))?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function createPending2FAToken(userId: string, remember: boolean, area: SessionArea = "cms") {
  return new SignJWT({ purpose: "2fa-pending", sub: userId, remember, area })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secretKey());
}

export async function verifyPending2FAToken(
  token: string
): Promise<{ sub: string; remember: boolean; area: SessionArea } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "2fa-pending" || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, remember: Boolean(payload.remember), area: parseArea(payload.area) };
  } catch {
    return null;
  }
}
