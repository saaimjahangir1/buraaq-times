import { NextRequest, NextResponse } from "next/server";
import { getSession, Role, writerState, proofreaderState } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrf } from "@/lib/csrf";

/**
 * Verifies the caller is signed in, (unless admin) approved, and — for
 * state-changing requests — passes the CSRF double-submit check. Returns
 * either the fresh DB user or a NextResponse to return immediately.
 *
 * `req` is optional for call sites that only ever GET (CSRF is a no-op for
 * GET anyway); pass it whenever the route also handles POST/PATCH/DELETE.
 */
export async function requireApprovedUser(
  req?: NextRequest,
  opts: { allowProofreader?: boolean } = {}
): Promise<{ id: string; name: string; email: string; role: Role; status: string } | NextResponse> {
  if (req && !verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
  }

  const select = { id: true, name: true, email: true, role: true, status: true, proofreaderStatus: true } as const;
  const session = await getSession("cms");
  const user = session ? await prisma.user.findUnique({ where: { id: session.sub }, select }) : null;

  if (!user || writerState(user) !== "APPROVED") {
    // Routes that proofreaders also use from the desk (e.g. regenerating
    // branded images) accept the desk sign-in of an approved proofreader.
    if (opts.allowProofreader) {
      const desk = await getSession("desk");
      const deskUser = desk ? await prisma.user.findUnique({ where: { id: desk.sub }, select }) : null;
      if (deskUser && proofreaderState(deskUser) === "APPROVED") return { ...deskUser, role: deskUser.role as Role };
      if (user && proofreaderState(user) === "APPROVED") return { ...user, role: user.role as Role };
    }
  }
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const writer = writerState(user);
  if (writer !== "APPROVED") {
    return NextResponse.json(
      { error: writer === null ? "This account doesn't have writer access" : "Account pending approval" },
      { status: 403 }
    );
  }
  return { ...user, role: user.role as Role };
}

/**
 * Guard for /api/proofread/* — approved, email-verified proofreaders, plus
 * admins (who can also release stuck claims), signed in to the proofreading
 * desk (the CMS sign-in doesn't count here). Same CSRF rules as above.
 */
export async function requireProofreader(
  req?: NextRequest
): Promise<{ id: string; name: string; email: string; role: Role } | NextResponse> {
  if (req && !verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
  }

  const session = await getSession("desk");
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, status: true, proofreaderStatus: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const state = proofreaderState(user);
  if (state === null) {
    return NextResponse.json({ error: "Proofreaders only" }, { status: 403 });
  }
  if (state !== "APPROVED") {
    return NextResponse.json({ error: "Proofreader access pending approval" }, { status: 403 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: "Verify your email first" }, { status: 403 });
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
