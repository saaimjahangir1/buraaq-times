import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { checkCode } from "@/lib/two-factor";
import { notify } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ code: z.string().length(6) });

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;
  const { ok } = await rateLimit(`2fa-profile-verify:${guard.id}`, 20, 10 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many attempts — wait a few minutes." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: guard.id } });
  if (!user?.totpPendingSecret) {
    return NextResponse.json({ error: "Start setup first." }, { status: 400 });
  }
  const check = await checkCode(user, user.totpPendingSecret, parsed.data.code, { allowReuse: true });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  await prisma.user.update({
    where: { id: guard.id },
    data: { totpSecret: user.totpPendingSecret, totpPendingSecret: null, totpEnabled: true, totpLastStep: check.step },
  });
  await notify(guard.id, "ACCOUNT", "Authenticator app changed", "Sign-in codes now come from your new authenticator app.");

  return NextResponse.json({ ok: true });
}
