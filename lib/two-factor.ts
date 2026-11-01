import "server-only";
import { prisma } from "./prisma";
import { totpStep } from "./totp";

// Checking a 6-digit code for an account, with two protections:
//  - wrong codes are counted in the database: after 5 in a row, codes are
//    refused for 5 minutes (works the same on the VPS and on every Vercel instance);
//  - a code that was already accepted can't be used again (replay).

const MAX_FAILURES = 5;
const LOCK_MS = 5 * 60_000;

type Account = { id: string; totpLastStep: number | null; totpFailures: number; totpLockedUntil: Date | null };
export type CodeCheck = { ok: true; step: number } | { ok: false; status: number; error: string };

export async function checkCode(user: Account, secret: string, code: string, opts: { allowReuse?: boolean } = {}): Promise<CodeCheck> {
  if (user.totpLockedUntil && user.totpLockedUntil > new Date()) {
    return { ok: false, status: 429, error: "Too many wrong codes — wait 5 minutes and try again." };
  }
  const step = totpStep(secret, code);
  const reused = step !== null && !opts.allowReuse && user.totpLastStep !== null && step <= user.totpLastStep;
  if (step === null || reused) {
    const failures = (user.totpFailures ?? 0) + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: failures >= MAX_FAILURES ? { totpFailures: 0, totpLockedUntil: new Date(Date.now() + LOCK_MS) } : { totpFailures: failures },
    });
    return { ok: false, status: 401, error: "Incorrect code." };
  }
  // Claim the step atomically, so two requests can't both use the same code.
  const claimed = await prisma.user.updateMany({
    where: opts.allowReuse ? { id: user.id } : { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
    data: { totpLastStep: step, totpFailures: 0, totpLockedUntil: null },
  });
  if (claimed.count !== 1) return { ok: false, status: 401, error: "Incorrect code." };
  return { ok: true, step };
}
