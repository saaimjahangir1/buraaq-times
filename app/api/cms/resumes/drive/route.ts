import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNextResponse } from "@/lib/cms-guard";
import { requireAdmin } from "@/lib/admin-guard";
import { DriveError, ensureFolder, uploadPdf } from "@/lib/google-drive";
import { driveFileName } from "@/lib/resume/stored";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 6; // per request; the CMS keeps calling until nothing is left
const TIME_BUDGET_MS = 40_000;
const STALE_CLAIM_MS = 5 * 60_000;

// "Save to Drive": uploads waiting resumes (oldest first) to the shared Drive
// folder and deletes each one from the site once Google has it.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  const started = Date.now();
  let folderId: string;
  try {
    folderId = await ensureFolder();
  } catch (e) {
    const err = e instanceof DriveError ? e : new DriveError("Couldn't reach Google Drive. Please try again.");
    if (!(e instanceof DriveError)) console.error("[drive] folder check failed:", e);
    return NextResponse.json({ error: err.message, reconnect: err.reconnect }, { status: 502 });
  }

  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
  const candidates = await prisma.resume.findMany({
    where: { OR: [{ savingAt: null }, { savingAt: { lt: staleBefore } }] },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, savingAt: true },
  });

  let saved = 0;
  const failed: { name: string; error: string }[] = [];
  let reconnect = false;

  for (const c of candidates) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    // Take it, so another admin's run (or a second click) can't upload it too.
    const claim = await prisma.resume.updateMany({ where: { id: c.id, savingAt: c.savingAt }, data: { savingAt: new Date() } });
    if (claim.count === 0) continue;
    const r = await prisma.resume.findUnique({ where: { id: c.id } });
    if (!r) continue;
    try {
      const created = r.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" });
      const description = [
        r.email && `Email: ${r.email}`,
        r.phone && `Phone: ${r.phone}`,
        r.location && `Location: ${r.location}`,
        `Created: ${created} PKT`,
        "From the Buraaq Times Resume Builder",
      ]
        .filter(Boolean)
        .join(" · ");
      await uploadPdf(folderId, driveFileName(r), description, Buffer.from(r.pdf));
      await prisma.resume.deleteMany({ where: { id: r.id } });
      saved += 1;
    } catch (e) {
      await prisma.resume.updateMany({ where: { id: r.id }, data: { savingAt: null } });
      const err = e instanceof DriveError ? e : new DriveError("Upload failed. Please try again.");
      if (!(e instanceof DriveError)) console.error("[drive] upload error:", e);
      failed.push({ name: r.name, error: err.message });
      if (err.reconnect) {
        reconnect = true;
        break;
      }
      if (failed.length >= 2) break; // something's wrong — stop and show it
    }
  }

  const remaining = await prisma.resume.count();
  return NextResponse.json({ saved, remaining, failed, reconnect });
}
