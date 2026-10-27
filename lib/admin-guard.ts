import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireApprovedUser, isNextResponse } from "./cms-guard";

/** Signed-in admin (CMS sign-in) or the response to return. CSRF-checked when req is given. */
export async function requireAdmin(req?: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;
  if (guard.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  return guard;
}
