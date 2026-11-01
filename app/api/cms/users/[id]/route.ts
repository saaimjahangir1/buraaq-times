import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { notify } from "@/lib/notifications";
import { writerState, proofreaderState } from "@/lib/auth";
import { emailProofreaderApproved, emailWriterApproved } from "@/lib/proofread";

const access = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const schema = z.object({
  // Writer access: the writing role and its approval.
  role: z.enum(["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR", "PROOFREADER"]).optional(),
  status: access.optional(),
  // Proofreader access, approved separately. null removes it.
  proofreaderStatus: access.nullable().optional(),
  // Admin vouches for the address (e.g. the verification email never arrived).
  emailVerified: z.literal(true).optional(),
  // Lost phone: turn off their 2FA and sign them out everywhere. They set up a
  // new authenticator at their next sign-in (2FA is required for everyone).
  reset2fa: z.literal(true).optional(),
});

// What the admin page gets back — never password hashes, 2FA secrets or tokens.
const SAFE_USER = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  proofreaderStatus: true,
  emailVerified: true,
  totpEnabled: true,
  bio: true,
  createdAt: true,
} as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;
  if (guard.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const body = parsed.data;

  const before = await prisma.user.findUnique({
    where: { id: params.id },
    select: { role: true, status: true, proofreaderStatus: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.reset2fa) {
    if (params.id === guard.id) {
      return NextResponse.json(
        { error: "You can't reset your own 2FA here — use Profile → Move to a new phone, or ask another admin." },
        { status: 400 }
      );
    }
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { totpEnabled: false, totpSecret: null, totpPendingSecret: null, totpLastStep: null, totpFailures: 0, totpLockedUntil: null, sessionVersion: { increment: 1 } },
      select: SAFE_USER,
    });
    await notify(user.id, "ACCOUNT", "Two-factor sign-in was reset", `${guard.name} reset your 2FA. Set up a new authenticator app at your next sign-in.`);
    return NextResponse.json({ user });
  }

  const role = body.role ?? before.role;
  const data: {
    role?: string;
    status?: string;
    proofreaderStatus?: string | null;
    emailVerified?: boolean;
    emailVerifyToken?: null;
    emailVerifyExpires?: null;
  } = {};
  if (body.emailVerified) Object.assign(data, { emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null });
  if (body.role) data.role = body.role;
  if (body.status) data.status = body.status;

  // Older proofreader-only accounts keep their proofreader approval in
  // `status`. Write it into proofreaderStatus before anything changes, so it
  // survives the account also becoming a writer.
  let proofreader: string | null = before.proofreaderStatus ?? (before.role === "PROOFREADER" ? before.status : null);
  if (body.proofreaderStatus !== undefined) proofreader = body.proofreaderStatus;
  // "Proofreader only" means they proofread: give it if they didn't have it.
  if (body.role === "PROOFREADER" && before.role !== "PROOFREADER" && proofreader === null) proofreader = "APPROVED";

  if (role === "PROOFREADER") {
    if (proofreader === null) {
      return NextResponse.json(
        { error: "This account has no writer role, so removing proofreader access would leave it with nothing. Reject it instead." },
        { status: 400 }
      );
    }
    // For proofreader-only accounts the account status mirrors proofreading.
    if (body.status && body.proofreaderStatus === undefined) proofreader = body.status;
    data.status = proofreader;
  }
  data.proofreaderStatus = proofreader;

  const updated = await prisma.user.update({ where: { id: params.id }, data });
  const user = { ...updated };

  // Tell them about decisions that changed.
  const wasWriter = writerState(before);
  const isWriter = writerState(user);
  const wasProofreader = proofreaderState(before);
  const isProofreader = proofreaderState(user);
  if (user.role !== "ADMIN") {
    if (isWriter === "APPROVED" && wasWriter !== "APPROVED") {
      await notify(user.id, "ACCOUNT", "Writer access approved", "You can now write on Buraaq Times.");
      await emailWriterApproved(user);
    } else if (isWriter === "REJECTED" && wasWriter !== "REJECTED") {
      await notify(user.id, "ACCOUNT", "Writer access not approved", "An admin has declined writer access for your account.");
    }
    if (isProofreader === "APPROVED" && wasProofreader !== "APPROVED") {
      await emailProofreaderApproved(user);
    } else if (isProofreader === "REJECTED" && wasProofreader !== "REJECTED") {
      await notify(user.id, "ACCOUNT", "Proofreader access not approved", "An admin has declined proofreader access for your account.");
    }
  }

  const safe = await prisma.user.findUnique({ where: { id: params.id }, select: SAFE_USER });
  return NextResponse.json({ user: safe });
}
