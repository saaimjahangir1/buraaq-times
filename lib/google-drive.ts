import "server-only";
import crypto from "crypto";
import { prisma } from "./prisma";
import { SITE_URL } from "./seo";

// One Google Drive for the whole site: an admin connects a Google account once
// (CMS → Resumes → Connect Google Drive) and every admin's "Save to Drive"
// uploads into the same "Buraaq Times – Resumes" folder in that Drive.
//
// Needs an OAuth client from Google Cloud (VPS .env and Vercel):
//   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
// with this authorised redirect URI:  <site>/api/cms/drive/callback
//
// Scope "drive.file": the site can only see and change files it created
// itself — never anything else in that Drive.

const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/drive.file"];
const SETTING_KEY = "googleDrive";
export const FOLDER_NAME = "Buraaq Times – Resumes";

export class DriveError extends Error {
  constructor(message: string, public reconnect = false) {
    super(message);
  }
}

export function oauthConfigured() {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export const redirectUri = () => `${SITE_URL}/api/cms/drive/callback`;

/* ---------- small crypto helpers (key derived from JWT_SECRET) ---------- */

function key(purpose: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return crypto.createHash("sha256").update(`${purpose}:${secret}`).digest();
}

export function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key("drive-token"), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(blob: string) {
  const [iv, tag, enc] = blob.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key("drive-token"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Signed, short-lived "state" for the Google sign-in, so nobody can forge a connection. */
export function makeState(userId: string, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ u: userId, exp: now + 10 * 60_000, n: crypto.randomBytes(8).toString("hex") })).toString("base64url");
  const sig = crypto.createHmac("sha256", key("drive-state")).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readState(state: string, now = Date.now()): { userId: string } | null {
  const [body, sig] = (state || "").split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", key("drive-state")).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { u: string; exp: number };
    return p.exp > now && typeof p.u === "string" ? { userId: p.u } : null;
  } catch {
    return null;
  }
}

/* ---------- connection stored in the database ---------- */

type Stored = { refreshToken: string; email: string; folderId: string | null; connectedBy: string; connectedAt: string };

async function readStored(): Promise<Stored | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as Stored;
  } catch {
    return null;
  }
}

async function writeStored(value: Stored) {
  const json = JSON.stringify(value);
  await prisma.appSetting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value: json }, update: { value: json } });
}

export type DriveStatus =
  | { state: "not-configured" }
  | { state: "disconnected" }
  | { state: "connected"; email: string; folderUrl: string | null; connectedBy: string; connectedAt: string };

export async function driveStatus(): Promise<DriveStatus> {
  if (!oauthConfigured()) return { state: "not-configured" };
  const s = await readStored();
  if (!s) return { state: "disconnected" };
  return {
    state: "connected",
    email: s.email,
    folderUrl: s.folderId ? `https://drive.google.com/drive/folders/${s.folderId}` : null,
    connectedBy: s.connectedBy,
    connectedAt: s.connectedAt,
  };
}

export function authUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      ...params,
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  return { ok: res.ok, data };
}

/** Finishes "Connect Google Drive": swaps Google's code for a long-lived token and stores it. */
export async function connectWithCode(code: string, connectedBy: string) {
  const { ok, data } = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!ok || !data.access_token) {
    console.error("[drive] code exchange failed:", data.error, data.error_description);
    throw new DriveError("Google didn't accept the sign-in. Please try connecting again.");
  }
  if (!data.scope?.includes("https://www.googleapis.com/auth/drive.file")) {
    throw new DriveError("Google Drive access wasn't allowed. Connect again and tick the Google Drive permission.");
  }
  if (!data.refresh_token) {
    throw new DriveError("Google didn't give lasting access. Remove the app at myaccount.google.com/permissions, then connect again.");
  }
  let email = "";
  try {
    email = JSON.parse(Buffer.from((data.id_token || "").split(".")[1] || "", "base64url").toString()).email || "";
  } catch {
    /* email is just for display */
  }
  accessCache = { token: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  const previous = await readStored();
  await writeStored({
    refreshToken: encrypt(data.refresh_token),
    email: email || "Google account",
    // Same Google account as before → keep using its folder.
    folderId: previous && previous.email === email ? previous.folderId : null,
    connectedBy,
    connectedAt: new Date().toISOString(),
  });
  await ensureFolder();
  return email;
}

export async function disconnectDrive() {
  const s = await readStored();
  if (s) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(s.refreshToken))}`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      /* removing it here is what matters */
    }
  }
  await prisma.appSetting.deleteMany({ where: { key: SETTING_KEY } });
  accessCache = null;
}

/* ---------- Drive calls ---------- */

let accessCache: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (accessCache && accessCache.expires > Date.now() + 60_000) return accessCache.token;
  const s = await readStored();
  if (!s) throw new DriveError("Google Drive isn't connected.", true);
  let refresh: string;
  try {
    refresh = decrypt(s.refreshToken);
  } catch {
    throw new DriveError("The saved Drive connection can't be read on this server (different JWT_SECRET?). Connect Google Drive again.", true);
  }
  const { ok, data } = await tokenRequest({ refresh_token: refresh, grant_type: "refresh_token" });
  if (!ok || !data.access_token) {
    console.error("[drive] refresh failed:", data.error, data.error_description);
    if (data.error === "invalid_grant") {
      throw new DriveError("The Google Drive connection has expired or was removed. Connect Google Drive again.", true);
    }
    throw new DriveError("Couldn't reach Google Drive. Please try again.");
  }
  accessCache = { token: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

async function drive(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), authorization: `Bearer ${await accessToken()}` },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (res.status === 401) accessCache = null;
  return res;
}

/** The "Buraaq Times – Resumes" folder, created on first use (or again if it was deleted). */
export async function ensureFolder(): Promise<string> {
  const s = await readStored();
  if (!s) throw new DriveError("Google Drive isn't connected.", true);
  if (s.folderId) {
    const res = await drive(`https://www.googleapis.com/drive/v3/files/${s.folderId}?fields=id,trashed`);
    if (res.ok && !((await res.json()) as { trashed?: boolean }).trashed) return s.folderId;
  }
  const res = await drive("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!res.ok) {
    console.error("[drive] folder create failed:", res.status, await res.text().catch(() => ""));
    throw new DriveError("Couldn't create the resumes folder in Google Drive.");
  }
  const { id } = (await res.json()) as { id: string };
  await writeStored({ ...s, folderId: id });
  return id;
}

/** Uploads one PDF into the folder. Returns the new file's id. */
export async function uploadPdf(folderId: string, name: string, description: string, pdf: Buffer): Promise<string> {
  const boundary = `bt${crypto.randomBytes(12).toString("hex")}`;
  const meta = JSON.stringify({ name, parents: [folderId], description, mimeType: "application/pdf" });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
    pdf,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await drive("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[drive] upload failed:", res.status, text.slice(0, 300));
    if (res.status === 404) throw new DriveError("The resumes folder disappeared from Drive. Try again to create a new one.");
    if (/storageQuotaExceeded|quota/i.test(text)) throw new DriveError("That Google Drive is full.");
    throw new DriveError("Google Drive didn't accept the file. Please try again.");
  }
  return ((await res.json()) as { id: string }).id;
}
