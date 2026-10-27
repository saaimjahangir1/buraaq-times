import { NextRequest, NextResponse } from "next/server";
import { isNextResponse } from "@/lib/cms-guard";
import { requireAdmin } from "@/lib/admin-guard";
import { disconnectDrive } from "@/lib/google-drive";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;
  await disconnectDrive();
  return NextResponse.json({ ok: true });
}
