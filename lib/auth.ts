import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";

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
  /** The account's sessionVersion when signed in; older sign-ins stop working when it changes. */
  sv?: number;
}

// The placeholder from .env.example — public, so anyone could forge a sign-in with it.
const EXAMPLE_SECRET = "change-this-to-a-long-random-string";
let warnedShortSecret = false;

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  if (secret.trim() === EXAMPLE_SECRET) {
    throw new Error("JWT_SECRET is still the example value from .env.example. Set a random one: openssl rand -base64 48");
  }
  if (secret.length < 32 && !warnedShortSecret) {
    warnedShortSecret = true;
    console.error("[security] JWT_SECRET is shorter than 32 characters. Replace it with: openssl rand -base64 48");
  }
  return new TextEncoder().encode(secret);
}

// Only this algorithm is accepted when checking a token.
const VERIFY = { algorithms: ["HS256"] };

export const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** True for hashes made with fewer rounds than today's setting (re-hashed at the next sign-in). */
export function needsRehash(hash: string) {
  try {
    return bcrypt.getRounds(hash) < BCRYPT_ROUNDS;
  } catch {
    return false;
  }
}

// A real hash to compare against when the email isn't found, so a wrong email
// takes as long as a wrong password (no way to tell which emails have accounts).
let dummyHash: Promise<string> | null = null;
export async function verifyPasswordOrDummy(password: string, hash: string | null | undefined) {
  if (!hash) {
    dummyHash ??= bcrypt.hash("not-a-real-password", BCRYPT_ROUNDS);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
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
    const { payload } = await jwtVerify(token, secretKey(), VERIFY);
    // Sign-in tokens for the 2FA step (they carry a "purpose") are never a session.
    if (payload.purpose !== undefined || typeof payload.sub !== "string") return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * The signed-in user for one area (the CMS by default, or the proofreading desk).
 * Also checked against the database: the account must still exist, have
 * two-factor sign-in turned on, and not have been signed out everywhere
 * (password reset / 2FA reset) since this sign-in.
 */
export async function getSession(area: SessionArea = "cms"): Promise<SessionPayload | null> {
  const token = cookies().get(sessionCookieName(area))?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { totpEnabled: true, sessionVersion: true },
  });
  if (!user || !user.totpEnabled || (user.sessionVersion ?? 0) !== (session.sv ?? 0)) return null;
  return session;
}

/**
 * Short-lived tokens for the steps between "password correct" and "signed in":
 *  - "2fa-pending": enter the code from your authenticator app
 *  - "2fa-setup":   no authenticator yet — set one up now (required for every account)
 */
export type PendingPurpose = "2fa-pending" | "2fa-setup";

export async function createPending2FAToken(
  userId: string,
  remember: boolean,
  area: SessionArea = "cms",
  purpose: PendingPurpose = "2fa-pending"
) {
  return new SignJWT({ purpose, sub: userId, remember, area })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(purpose === "2fa-setup" ? "15m" : "5m")
    .sign(secretKey());
}

export async function verifyPending2FAToken(
  token: string,
  purpose: PendingPurpose = "2fa-pending"
): Promise<{ sub: string; remember: boolean; area: SessionArea } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), VERIFY);
    if (payload.purpose !== purpose || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, remember: Boolean(payload.remember), area: parseArea(payload.area) };
  } catch {
    return null;
  }
}

/* ---------- "Remember me": skip the 2FA code on this device for 7 days ---------- */

// After someone enters a correct code with "Remember me" ticked, their browser
// gets a signed "trusted device" cookie. Signing in again from that browser
// within 7 days needs only the password. It stops working early if their 2FA
// is reset or moved to a new phone, or their password is reset (all accounts
// signed out). One cookie per account, so people sharing a computer don't mix.

export const TRUST_DAYS = 7;

export function trustCookieName(userId: string) {
  return `bt_2fa_${crypto.createHash("sha256").update(userId).digest("hex").slice(0, 16)}`;
}

// Ties the trust to the current authenticator without putting its secret in the cookie.
function authenticatorFingerprint(totpSecret: string) {
  return crypto.createHmac("sha256", secretKey()).update(`totp:${totpSecret}`).digest("base64url").slice(0, 22);
}

type TrustUser = { id: string; totpEnabled: boolean; totpSecret: string | null; sessionVersion?: number | null };

export async function createTrustToken(user: TrustUser) {
  if (!user.totpSecret) throw new Error("No authenticator set up");
  return new SignJWT({ purpose: "2fa-trust", sub: user.id, sv: user.sessionVersion ?? 0, fp: authenticatorFingerprint(user.totpSecret) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TRUST_DAYS}d`)
    .sign(secretKey());
}

export async function isTrustedDevice(token: string | undefined, user: TrustUser): Promise<boolean> {
  if (!token || !user.totpEnabled || !user.totpSecret) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), VERIFY);
    return (
      payload.purpose === "2fa-trust" &&
      payload.sub === user.id &&
      payload.sv === (user.sessionVersion ?? 0) &&
      payload.fp === authenticatorFingerprint(user.totpSecret)
    );
  } catch {
    return false; // expired (older than 7 days), tampered with, or signed with another key
  }
}
