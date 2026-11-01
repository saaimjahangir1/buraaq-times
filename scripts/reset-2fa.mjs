// Emergency: someone lost their phone and no other admin can reset their 2FA
// from CMS → Users. Run on the server:
//   node scripts/reset-2fa.mjs person@example.com
// Their 2FA is turned off and they're signed out everywhere; at their next
// sign-in they set up a new authenticator app (2FA is required for everyone).
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./load-env.mjs";

loadEnv();
const email = (process.argv[2] || "").trim();
if (!email) {
  console.error("Usage: node scripts/reset-2fa.mjs person@example.com");
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  const r = await prisma.user.updateMany({
    where: { email: { equals: email, mode: "insensitive" } },
    data: { totpEnabled: false, totpSecret: null, totpPendingSecret: null, totpLastStep: null, totpFailures: 0, totpLockedUntil: null, sessionVersion: { increment: 1 } },
  });
  console.log(r.count ? `2FA reset for ${email}. They'll set up a new authenticator at their next sign-in.` : `No account with the email ${email}.`);
} finally {
  await prisma.$disconnect();
}
