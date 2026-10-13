import { NextRequest, NextResponse } from "next/server";
import { parseArea } from "@/lib/auth";
import { clearSession } from "@/lib/session";

// POST /api/cms/auth/logout            → signs out of the editorial CMS
// POST /api/cms/auth/logout?area=desk  → signs out of the proofreading desk
// Each leaves the other sign-in alone.
export async function POST(req: NextRequest) {
  const area = parseArea(req.nextUrl.searchParams.get("area"));
  return clearSession(req, NextResponse.json({ ok: true }), area);
}
