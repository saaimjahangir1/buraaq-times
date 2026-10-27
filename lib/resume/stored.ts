import "server-only";
import crypto from "crypto";
import type { ResumeData } from "./resume";

// Saved copies of resumes made with the public Resume Builder.

export const MAX_PDF_BYTES = 2 * 1024 * 1024;
export const MAX_DATA_BYTES = 100_000;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\u0000/g, "").trim().slice(0, max) : "");
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);
const objList = <T>(v: unknown, maxItems: number, map: (o: Record<string, unknown>) => T) =>
  (Array.isArray(v) ? v : [])
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .slice(0, maxItems)
    .map(map);

/** Only the fields a resume has, with sane lengths — whatever the browser sent. */
export function cleanResumeData(raw: unknown): ResumeData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const contact = (r.contact && typeof r.contact === "object" ? r.contact : {}) as Record<string, unknown>;
  const data: ResumeData = {
    name: str(r.name, 120),
    headline: str(r.headline, 200),
    contact: {
      email: str(contact.email, 200),
      phone: str(contact.phone, 60),
      location: str(contact.location, 120),
      links: strList(contact.links, 6, 300),
    },
    summary: str(r.summary, 2000),
    experience: objList(r.experience, 12, (e) => ({
      role: str(e.role, 160),
      company: str(e.company, 160),
      location: str(e.location, 120),
      dates: str(e.dates, 80),
      bullets: strList(e.bullets, 10, 400),
    })),
    education: objList(r.education, 10, (e) => ({
      degree: str(e.degree, 200),
      institution: str(e.institution, 200),
      location: str(e.location, 120),
      dates: str(e.dates, 80),
      details: strList(e.details, 6, 300),
    })),
    projects: objList(r.projects, 10, (p) => ({ name: str(p.name, 160), link: str(p.link, 300), bullets: strList(p.bullets, 6, 400) })),
    skills: objList(r.skills, 10, (g) => ({ category: str(g.category, 80), items: strList(g.items, 40, 80) })),
    certifications: strList(r.certifications, 15, 200),
    languages: strList(r.languages, 15, 60),
  };
  return data;
}

export function isPdf(bytes: Uint8Array) {
  return bytes.length > 100 && Buffer.from(bytes.subarray(0, 5)).toString("latin1") === "%PDF-";
}

export function newEditKey() {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function sameKey(key: string, hash: string) {
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** The columns shown in the CMS list, taken from the resume itself. */
export function summaryFields(d: ResumeData) {
  return {
    name: d.name || "Unnamed",
    headline: d.headline || null,
    email: d.contact.email || null,
    phone: d.contact.phone || null,
    location: d.contact.location || null,
  };
}

/** "Ayesha Khan – Frontend Developer – 27 Oct 2026.pdf" */
export function driveFileName(r: { name: string; headline: string | null; createdAt: Date }) {
  const date = r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
  const clean = (s: string) => s.replace(/[\\/:*?"<>|\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return `${[clean(r.name) || "Unnamed", r.headline ? clean(r.headline).slice(0, 80) : ""].filter(Boolean).join(" – ")} – ${date}.pdf`;
}
