// Shared types + helpers for the AI Resume Builder.
// Imported by BOTH the client builder and /api/resume/generate, so this file
// must stay free of server-only (fs, env secrets) and browser-only (window) APIs.

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ExperienceInput = {
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  notes: string; // rough, free-form notes about what they did
};

export type EducationInput = {
  degree: string;
  institution: string;
  location: string;
  start: string;
  end: string;
  details: string; // grades, thesis, honours, coursework…
};

export type ProjectInput = {
  name: string;
  link: string;
  notes: string;
};

export type ResumeInput = {
  fullName: string;
  targetRole: string;
  email: string;
  phone: string;
  location: string;
  links: string; // one per line
  summaryNotes: string;
  experience: ExperienceInput[];
  education: EducationInput[];
  projects: ProjectInput[];
  skills: string; // comma or line separated
  certifications: string; // one per line
  languages: string; // comma separated
  jobDescription: string; // optional: tailor to this posting
};

/** What the AI is allowed to write. Facts (names, dates, contacts) never go through it. */
export type AiResumeContent = {
  headline: string;
  summary: string;
  experience: { bullets: string[] }[]; // same order + length as cleaned input
  education: { details: string[] }[];
  projects: { bullets: string[] }[];
  skills: { category: string; items: string[] }[];
};

/** The final, render-ready resume (used by the preview, the editor and the PDF). */
export type ResumeData = {
  name: string;
  headline: string;
  contact: { email: string; phone: string; location: string; links: string[] };
  summary: string;
  experience: { role: string; company: string; location: string; dates: string; bullets: string[] }[];
  education: { degree: string; institution: string; location: string; dates: string; details: string[] }[];
  projects: { name: string; link: string; bullets: string[] }[];
  skills: { category: string; items: string[] }[];
  certifications: string[];
  languages: string[];
};

/* ------------------------------------------------------------------ */
/* Limits + empty factories                                            */
/* ------------------------------------------------------------------ */

export const LIMITS = {
  experience: 8,
  education: 5,
  projects: 6,
  short: 120,
  link: 200,
  notes: 1500,
  list: 800,
  jobDescription: 4000,
} as const;

export const emptyExperience = (): ExperienceInput => ({
  role: "",
  company: "",
  location: "",
  start: "",
  end: "",
  current: false,
  notes: "",
});

export const emptyEducation = (): EducationInput => ({
  degree: "",
  institution: "",
  location: "",
  start: "",
  end: "",
  details: "",
});

export const emptyProject = (): ProjectInput => ({ name: "", link: "", notes: "" });

export const emptyInput = (): ResumeInput => ({
  fullName: "",
  targetRole: "",
  email: "",
  phone: "",
  location: "",
  links: "",
  summaryNotes: "",
  experience: [emptyExperience()],
  education: [emptyEducation()],
  projects: [],
  skills: "",
  certifications: "",
  languages: "",
  jobDescription: "",
});

/* ------------------------------------------------------------------ */
/* Low-level sanitisers (input is untrusted on the server)             */
/* ------------------------------------------------------------------ */

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function arr(v: unknown, max: number): unknown[] {
  return Array.isArray(v) ? v.slice(0, max) : [];
}

/** Single-line text: collapse whitespace. */
function line(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Multi-line text: keep newlines, trim the ends. */
function block(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";
}

const BULLET_PREFIX = /^[\s\-–—•*·▪●◦>]+/;

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** "a, b\nc; d" → ["a","b","c","d"], de-duplicated case-insensitively. */
export function splitList(s: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of s.split(/[,;\n]/)) {
    const t = part.replace(BULLET_PREFIX, "").trim();
    const key = t.toLowerCase();
    if (t && !seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

/** One item per line, stripping pasted bullet characters. */
export function splitLines(s: string): string[] {
  return s
    .split(/\n+/)
    .map((l) => l.replace(BULLET_PREFIX, "").trim())
    .filter(Boolean);
}

/** URLs never contain spaces/commas, so split on any of them. */
export function splitLinks(s: string): string[] {
  return Array.from(new Set(s.split(/[\s,]+/).map((l) => l.trim()).filter(Boolean)));
}

/** Drop blank entries (the editor keeps them while typing). */
export function tidy(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

export function formatDates(start: string, end: string, current = false): string {
  const finish = current ? "Present" : end;
  if (start && finish) return `${start} – ${finish}`;
  return start || finish || "";
}

export function resumeFileName(name: string): string {
  const base = name.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return `${base || "My"}-Resume.pdf`;
}

/* ------------------------------------------------------------------ */
/* Input cleaning + validation                                         */
/* ------------------------------------------------------------------ */

/** Normalise any (possibly hostile) payload into a ResumeInput and drop empty rows. */
export function cleanInput(raw: unknown): ResumeInput {
  const r = obj(raw);
  return {
    fullName: line(r.fullName, LIMITS.short),
    targetRole: line(r.targetRole, LIMITS.short),
    email: line(r.email, LIMITS.short),
    phone: line(r.phone, 40),
    location: line(r.location, LIMITS.short),
    links: block(r.links, LIMITS.link * 4),
    summaryNotes: block(r.summaryNotes, LIMITS.notes),
    experience: arr(r.experience, LIMITS.experience)
      .map((e) => {
        const o = obj(e);
        return {
          role: line(o.role, LIMITS.short),
          company: line(o.company, LIMITS.short),
          location: line(o.location, LIMITS.short),
          start: line(o.start, 30),
          end: line(o.end, 30),
          current: o.current === true,
          notes: block(o.notes, LIMITS.notes),
        };
      })
      .filter((e) => e.role || e.company),
    education: arr(r.education, LIMITS.education)
      .map((e) => {
        const o = obj(e);
        return {
          degree: line(o.degree, LIMITS.short),
          institution: line(o.institution, LIMITS.short),
          location: line(o.location, LIMITS.short),
          start: line(o.start, 30),
          end: line(o.end, 30),
          details: block(o.details, LIMITS.notes),
        };
      })
      .filter((e) => e.degree || e.institution),
    projects: arr(r.projects, LIMITS.projects)
      .map((p) => {
        const o = obj(p);
        return {
          name: line(o.name, LIMITS.short),
          link: line(o.link, LIMITS.link),
          notes: block(o.notes, LIMITS.notes),
        };
      })
      .filter((p) => p.name),
    skills: block(r.skills, LIMITS.list),
    certifications: block(r.certifications, LIMITS.list),
    languages: block(r.languages, 300),
    jobDescription: block(r.jobDescription, LIMITS.jobDescription),
  };
}

/** Is there anything for the AI to work with? (server + client) */
export function hasContent(i: ResumeInput): boolean {
  return (
    i.experience.length > 0 ||
    i.education.length > 0 ||
    i.projects.length > 0 ||
    splitList(i.skills).length > 0 ||
    i.summaryNotes.length > 0
  );
}

/** Client-side check before generating. Returns a message or null. */
export function validateForGenerate(i: ResumeInput): string | null {
  if (!i.fullName) return "Add your full name on the first step.";
  if (!i.email && !i.phone) return "Add an email or phone number so employers can reach you.";
  if (i.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email)) return "That email address doesn't look right. Check it on the first step.";
  if (!hasContent(i)) return "Add at least one job, degree, project or a few skills.";
  return null;
}

/** Strip the personal/contact fields before anything is sent to the server or AI. */
export function withoutContactDetails(i: ResumeInput): ResumeInput {
  return { ...i, fullName: "", email: "", phone: "", location: "", links: "" };
}

/* ------------------------------------------------------------------ */
/* AI output sanitising + final assembly                               */
/* ------------------------------------------------------------------ */

function bulletList(v: unknown, max = 6): string[] {
  return arr(v, max)
    .map((b) => line(b, 300).replace(BULLET_PREFIX, "").trim())
    .filter(Boolean);
}

/** Force the model's JSON into exactly the shape and lengths we expect. */
export function sanitizeAi(raw: unknown, input: ResumeInput): AiResumeContent {
  const r = obj(raw);
  const exp = arr(r.experience, 50);
  const edu = arr(r.education, 50);
  const proj = arr(r.projects, 50);
  return {
    headline: line(r.headline, LIMITS.short),
    summary: line(r.summary, 900),
    experience: input.experience.map((_, i) => ({ bullets: bulletList(obj(exp[i]).bullets) })),
    education: input.education.map((_, i) => ({ details: bulletList(obj(edu[i]).details, 4) })),
    projects: input.projects.map((_, i) => ({ bullets: bulletList(obj(proj[i]).bullets, 4) })),
    skills: arr(r.skills, 6)
      .map((g) => {
        const o = obj(g);
        return {
          category: line(o.category, 40),
          items: arr(o.items, 30)
            .map((x) => line(x, 60))
            .filter(Boolean),
        };
      })
      .filter((g) => g.items.length > 0),
  };
}

/**
 * Skills guard: keep only AI skill items that actually appear somewhere in what the
 * user wrote, then put any of the user's own skills the AI dropped into "Other".
 */
function mergeSkills(input: ResumeInput, aiSkills: AiResumeContent["skills"] | undefined) {
  const userSkills = splitList(input.skills);
  if (!aiSkills || aiSkills.length === 0) {
    return userSkills.length ? [{ category: "", items: userSkills }] : [];
  }
  const corpus = JSON.stringify(input).toLowerCase();
  const used = new Set<string>();
  const groups = aiSkills
    .map((g) => ({
      category: g.category,
      items: g.items.filter((item) => {
        const key = item.toLowerCase();
        if (used.has(key) || !corpus.includes(key)) return false;
        used.add(key);
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);
  const leftovers = userSkills.filter((s) => !used.has(s.toLowerCase()));
  if (leftovers.length) groups.push({ category: groups.length ? "Other" : "", items: leftovers });
  return groups;
}

/**
 * Build the final resume. Every factual field comes straight from the user's input;
 * the AI only contributes wording (headline, summary, bullets, skill grouping).
 * Pass ai = null to build a plain resume without AI.
 */
export function assembleResume(input: ResumeInput, ai: AiResumeContent | null): ResumeData {
  const fallbackBullets = (notes: string) => splitLines(notes).map(capitalise);
  const pick = (aiList: string[] | undefined, notes: string) =>
    aiList && aiList.length ? aiList : fallbackBullets(notes);

  return {
    name: input.fullName,
    headline: ai?.headline || input.targetRole,
    contact: {
      email: input.email,
      phone: input.phone,
      location: input.location,
      links: splitLinks(input.links),
    },
    summary: ai?.summary || input.summaryNotes.replace(/\s+/g, " ").trim(),
    experience: input.experience.map((e, i) => ({
      role: e.role,
      company: e.company,
      location: e.location,
      dates: formatDates(e.start, e.end, e.current),
      bullets: pick(ai?.experience[i]?.bullets, e.notes),
    })),
    education: input.education.map((e, i) => ({
      degree: e.degree,
      institution: e.institution,
      location: e.location,
      dates: formatDates(e.start, e.end),
      details: pick(ai?.education[i]?.details, e.details),
    })),
    projects: input.projects.map((p, i) => ({
      name: p.name,
      link: p.link,
      bullets: pick(ai?.projects[i]?.bullets, p.notes),
    })),
    skills: mergeSkills(input, ai?.skills),
    certifications: splitLines(input.certifications),
    languages: splitList(input.languages),
  };
}

/** Normalise a user-typed link into an href + a short display label. */
export function linkParts(raw: string): { href: string; label: string } {
  const trimmed = raw.trim();
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const label = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
  return { href, label };
}
