import "server-only";
import crypto from "crypto";

// Web Push (the standard behind browser notifications on Chrome, Edge,
// Firefox, Safari and Android), written with Node's own crypto — no extra
// package. Two parts:
//   1. VAPID (RFC 8292): a signed token proving the push comes from this site.
//   2. Message encryption (RFC 8291, "aes128gcm"): only the reader's browser
//      can read the notification text.
//
// Settings (VPS .env and Vercel, the same on both):
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY   public key the browser subscribes with
//   VAPID_PRIVATE_KEY              its private half (keep secret)
//   VAPID_SUBJECT                  optional contact, e.g. mailto:you@example.com

const b64u = (b: Buffer | Uint8Array) => Buffer.from(b).toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/* ---------- encryption (RFC 8291 / RFC 8188) ---------- */

function hmac(key: Buffer, data: Buffer) {
  return crypto.createHmac("sha256", key).update(data).digest();
}
/** HKDF with a single expand block (all outputs here are ≤ 32 bytes). */
function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number) {
  const prk = hmac(salt, ikm);
  return hmac(prk, Buffer.concat([info, Buffer.from([1])])).subarray(0, length);
}

export const RECORD_SIZE = 4096;

/**
 * Encrypts a notification for one browser subscription. `salt` and the
 * sender key pair are random in normal use; tests pass fixed ones to check
 * against the RFC's worked example.
 */
export function encryptPayload(
  plaintext: Buffer,
  subscription: { p256dh: string; auth: string },
  fixed?: { salt: Buffer; senderPrivateKey: Buffer }
) {
  const uaPublic = fromB64u(subscription.p256dh);
  const authSecret = fromB64u(subscription.auth);
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error("Invalid subscription keys");

  const ecdh = crypto.createECDH("prime256v1");
  if (fixed) ecdh.setPrivateKey(fixed.senderPrivateKey);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = hkdf(authSecret, sharedSecret, keyInfo, 32);

  const salt = fixed?.salt ?? crypto.randomBytes(16);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);

  // One record: the message, then the 0x02 "last record" delimiter.
  const record = Buffer.concat([plaintext, Buffer.from([2])]);
  if (record.length + 16 > RECORD_SIZE) throw new Error("Notification payload too large");
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(RECORD_SIZE);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, encrypted]);
}

/* ---------- VAPID (RFC 8292) ---------- */

function vapidPrivateKey() {
  const pub = fromB64u(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim());
  let d = fromB64u(process.env.VAPID_PRIVATE_KEY!.trim());
  if (d.length < 32) d = Buffer.concat([Buffer.alloc(32 - d.length), d]);
  return crypto.createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: b64u(d), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: "jwk",
  });
}

export function vapidAuthorization(endpoint: string, now = Math.floor(Date.now() / 1000)) {
  const audience = new URL(endpoint).origin;
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:theburaaqtimes@gmail.com";
  const unsigned = `${b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })))}.${b64u(
    Buffer.from(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: subject }))
  )}`;
  const sig = crypto.sign("sha256", Buffer.from(unsigned), { key: vapidPrivateKey(), dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${b64u(sig)}, k=${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim()}`;
}

/* ---------- which push services we'll talk to ---------- */

// The server POSTs to the address the browser gives it, so only accept the
// real browser push services (otherwise someone could make the site send
// requests to arbitrary addresses).
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge (some), Android, Opera, Brave
  /^android\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/, // Firefox
  /(^|\.)notify\.windows\.com$/, // Edge on Windows
  /(^|\.)push\.apple\.com$/, // Safari (macOS, iPhone/iPad home-screen apps)
];

export function isPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/* ---------- sending ---------- */

export type PushResult = "sent" | "gone" | "failed";

export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: Record<string, unknown>,
  opts: { ttlSeconds?: number; urgency?: "normal" | "high"; topic?: string } = {}
): Promise<PushResult> {
  const body = encryptPayload(Buffer.from(JSON.stringify(payload)), sub);
  const headers: Record<string, string> = {
    "content-type": "application/octet-stream",
    "content-encoding": "aes128gcm",
    ttl: String(opts.ttlSeconds ?? 24 * 3600),
    urgency: opts.urgency ?? "normal",
    authorization: vapidAuthorization(sub.endpoint),
  };
  // Topic: a newer message with the same topic replaces an undelivered older one.
  if (opts.topic) headers.topic = opts.topic.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  try {
    const res = await fetch(sub.endpoint, { method: "POST", headers, body, signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (res.status === 404 || res.status === 410) return "gone"; // unsubscribed / expired
    if (res.ok) return "sent";
    console.error("[push] push service said", res.status, (await res.text().catch(() => "")).slice(0, 200));
    return "failed";
  } catch (e) {
    console.error("[push] send failed:", e instanceof Error ? e.message : e);
    return "failed";
  }
}
