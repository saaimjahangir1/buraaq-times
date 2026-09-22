import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export * from "./auth-shared";
import type { Role, UserStatus } from "./auth-shared";

export const SESSION_COOKIE = "bt_session";

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

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function createPending2FAToken(userId: string, remember: boolean) {
  return new SignJWT({ purpose: "2fa-pending", sub: userId, remember })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secretKey());
}

export async function verifyPending2FAToken(
  token: string
): Promise<{ sub: string; remember: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "2fa-pending" || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, remember: Boolean(payload.remember) };
  } catch {
    return null;
  }
}
