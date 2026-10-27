import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectWithCode, DriveError, readState } from "@/lib/google-drive";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const back = (params: Record<string, string>) => NextResponse.redirect(`${SITE_URL}/cms/resumes?${new URLSearchParams(params)}`);

// Google sends the admin back here after "Connect Google Drive".
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return back({ drive: "error", msg: "Google Drive access wasn't allowed." });

  const state = readState(q.get("state") || "");
  if (!state) return back({ drive: "error", msg: "That sign-in link expired. Please try connecting again." });
  const admin = await prisma.user.findUnique({ where: { id: state.userId }, select: { name: true, role: true } });
  if (!admin || admin.role !== "ADMIN") return back({ drive: "error", msg: "Only admins can connect Google Drive." });

  const code = q.get("code");
  if (!code) return back({ drive: "error", msg: "Google didn't send a sign-in code. Please try again." });
  try {
    const email = await connectWithCode(code, admin.name);
    return back({ drive: "connected", email });
  } catch (e) {
    if (!(e instanceof DriveError)) console.error("[drive] connect failed:", e);
    return back({ drive: "error", msg: e instanceof DriveError ? e.message : "Couldn't connect Google Drive. Please try again." });
  }
}
