import { NextResponse } from "next/server";

// Two-factor sign-in is required for every account, so it can't be turned off.
// Lost your phone? An admin can reset it (CMS → Users → Reset 2FA); you then set
// up a new authenticator at your next sign-in.
export async function POST() {
  return NextResponse.json(
    { error: "Two-factor sign-in is required for every account. To change phones, use “Move to a new phone”." },
    { status: 403 }
  );
}
