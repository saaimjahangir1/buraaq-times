import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { driveStatus } from "@/lib/google-drive";
import ResumesManager from "@/components/cms/ResumesManager";

export const dynamic = "force-dynamic";

export default async function ResumesPage({ searchParams }: { searchParams: { drive?: string; msg?: string; email?: string } }) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/cms");

  const [rows, total, drive] = await Promise.all([
    prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, headline: true, email: true, phone: true, location: true, pdfSize: true, createdAt: true, savingAt: true },
    }),
    prisma.resume.count(),
    driveStatus(),
  ]);

  const flash =
    searchParams.drive === "connected"
      ? { ok: true, text: `Google Drive connected${searchParams.email ? ` (${searchParams.email})` : ""}. Resumes will be saved to the “Buraaq Times – Resumes” folder.` }
      : searchParams.drive === "error"
      ? { ok: false, text: searchParams.msg || "Couldn't connect Google Drive." }
      : searchParams.drive === "not-configured"
      ? { ok: false, text: "Google Drive isn't set up on this server yet — see the steps below." }
      : null;

  return (
    <ResumesManager
      rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), saving: Boolean(r.savingAt) }))}
      total={total}
      drive={drive}
      flash={flash}
    />
  );
}
