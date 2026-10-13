import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, writerState, proofreaderState, roleLabel, Role } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { notifyAdminsOfRequest } from "@/lib/proofread";

// Lets someone who already has one kind of access ask for the other with the
// same account: a writer asks to proofread, or a proofreader asks to write
// News or Articles. An admin approves it on the Users page.
const schema = z.object({
  kind: z.enum(["PROOFREADER", "NEWS_EDITOR", "ARTICLE_EDITOR"]),
  // Which sign-in the request comes from (CMS by default, or the desk).
  area: z.enum(["cms", "desk"]).optional(),
});

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
  const { ok } = await rateLimit(`request-access:${clientIp(req)}`, 5, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many requests — try again later." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { kind } = parsed.data;

  const session = await getSession(parsed.data.area ?? "cms");
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, status: true, proofreaderStatus: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: "Verify your email first." }, { status: 403 });

  if (kind === "PROOFREADER") {
    const state = proofreaderState(user);
    if (state === "APPROVED") return NextResponse.json({ ok: true, message: "You already have proofreader access." });
    if (state === "PENDING") return NextResponse.json({ ok: true, message: "Your request is already waiting for an admin." });
    if (state === "REJECTED") {
      return NextResponse.json(
        { error: "An admin declined proofreader access for this account. Contact the editorial team." },
        { status: 403 }
      );
    }
    await prisma.user.update({ where: { id: user.id }, data: { proofreaderStatus: "PENDING" } });
    await notifyAdminsOfRequest(
      "Proofreader access request",
      `${user.name} (${roleLabel(user.role as Role)}) asked to proofread too.`
    );
    return NextResponse.json({ ok: true, message: "Request sent. You'll get an email when an admin approves it." });
  }

  // Writer access: only for accounts that don't already have a writing role.
  const writer = writerState(user);
  if (writer !== null) {
    return NextResponse.json(
      { error: "This account already has a writer role. Ask an admin if you want it changed." },
      { status: 409 }
    );
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      // Keep their proofreading access exactly as it is before the account's
      // status starts meaning "writer approval".
      proofreaderStatus: proofreaderState(user),
      role: kind,
      status: "PENDING",
    },
  });
  await notifyAdminsOfRequest(
    "Writer access request",
    `${user.name} (proofreader) asked to write ${kind === "NEWS_EDITOR" ? "news" : "articles"} too.`
  );
  return NextResponse.json({ ok: true, message: "Request sent. You'll get an email when an admin approves it." });
}
