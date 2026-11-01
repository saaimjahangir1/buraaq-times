import "server-only";
import crypto from "crypto";

/**
 * Checks "Authorization: Bearer <CRON_SECRET>" on the scheduled-job endpoints
 * (Vercel Cron and the VPS scheduler). Compared in constant time, so the
 * secret can't be worked out from how fast wrong guesses are refused.
 * Refuses everything if CRON_SECRET is missing.
 */
export function cronAuthorized(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorization) return false;
  const expected = crypto.createHash("sha256").update(`Bearer ${secret}`).digest();
  const given = crypto.createHash("sha256").update(authorization).digest();
  return crypto.timingSafeEqual(expected, given);
}
