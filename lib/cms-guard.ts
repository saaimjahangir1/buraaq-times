import { NextRequest, NextResponse } from "next/server";
import { getSession, Role } from "@/lib/auth";
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
  req?: NextRequest
): Promise<{ id: string; name: string; email: string; role: Role; status: string } | NextResponse> {
  if (req && !verifyCsrf(req)) {
    return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "ADMIN" && user.status !== "APPROVED") {
    return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
  }
  return { ...user, role: user.role as Role };
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
