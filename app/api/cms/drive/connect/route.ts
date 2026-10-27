import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/cms-guard";
import { requireAdmin } from "@/lib/admin-guard";
import { authUrl, makeState, oauthConfigured } from "@/lib/google-drive";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

// "Connect Google Drive" → Google's sign-in page.
export async function GET() {
  const admin = await requireAdmin();
  if (isNextResponse(admin)) return NextResponse.redirect(`${SITE_URL}/cms/login`);
  if (!oauthConfigured()) return NextResponse.redirect(`${SITE_URL}/cms/resumes?drive=not-configured`);
  return NextResponse.redirect(authUrl(makeState(admin.id)));
}
