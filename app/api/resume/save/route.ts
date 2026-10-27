import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  MAX_DATA_BYTES,
  MAX_PDF_BYTES,
  cleanResumeData,
  hashKey,
  isPdf,
  newEditKey,
  sameKey,
  summaryFields,
} from "@/lib/resume/stored";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Resume Builder saves a copy of each resume it makes (the content plus
// the exact PDF). POST creates the copy and returns an edit key; PUT with that
// key replaces it when the visitor edits and downloads again, so one visitor
// session keeps one up-to-date copy instead of many.

async function readForm(req: NextRequest) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > MAX_PDF_BYTES + MAX_DATA_BYTES + 10_000) return { error: "That resume is too large.", status: 413 } as const;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { error: "Invalid request.", status: 400 } as const;
  }
  const file = form.get("pdf");
  const json = form.get("data");
  if (!(file instanceof Blob) || typeof json !== "string") return { error: "Invalid request.", status: 400 } as const;
  if (file.size > MAX_PDF_BYTES || json.length > MAX_DATA_BYTES) return { error: "That resume is too large.", status: 413 } as const;
  const pdf = Buffer.from(await file.arrayBuffer());
  if (!isPdf(pdf)) return { error: "Invalid resume file.", status: 400 } as const;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { error: "Invalid request.", status: 400 } as const;
  }
  const data = cleanResumeData(parsed);
  if (!data) return { error: "Invalid request.", status: 400 } as const;
  return { pdf, data } as const;
}

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`resume-save:${clientIp(req)}`, 15, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many resumes saved from here in the last hour." }, { status: 429 });

  const input = await readForm(req);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: input.status });

  const key = newEditKey();
  const row = await prisma.resume.create({
    data: {
      ...summaryFields(input.data),
      data: JSON.stringify(input.data),
      pdf: input.pdf,
      pdfSize: input.pdf.length,
      editKeyHash: hashKey(key),
    },
    select: { id: true },
  });
  return NextResponse.json({ id: row.id, key });
}

export async function PUT(req: NextRequest) {
  const { ok } = await rateLimit(`resume-update:${clientIp(req)}`, 60, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many updates." }, { status: 429 });

  const id = req.nextUrl.searchParams.get("id") || "";
  const key = req.headers.get("x-resume-key") || "";
  if (!id || !key) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const existing = await prisma.resume.findUnique({ where: { id }, select: { editKeyHash: true, savingAt: true } });
  // Gone (already moved to Drive or deleted) or not theirs: tell the browser to start a new copy.
  if (!existing || !sameKey(key, existing.editKeyHash)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.savingAt) return NextResponse.json({ error: "Being saved" }, { status: 409 });

  const input = await readForm(req);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: input.status });

  const updated = await prisma.resume.updateMany({
    where: { id, savingAt: null },
    data: { ...summaryFields(input.data), data: JSON.stringify(input.data), pdf: input.pdf, pdfSize: input.pdf.length },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id });
}
