"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  assembleResume,
  cleanInput,
  emptyEducation,
  emptyExperience,
  emptyInput,
  emptyProject,
  LIMITS,
  resumeFileName,
  validateForGenerate,
  withoutContactDetails,
  type AiResumeContent,
  type ResumeData,
  type ResumeInput,
} from "@/lib/resume/resume";
import ResumePreview from "./ResumePreview";
import ResumeEditor from "./ResumeEditor";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const DRAFT_KEY = "bt_resume_draft_v1";

const STEPS = ["About you", "Experience", "Education & projects", "Skills & target job"] as const;

// Accent colours for the resume itself. All pass contrast on white paper
// (the raw brand orange #F6A700 is too light for text on white, so "Amber" is its darker sibling).
const ACCENTS = [
  { name: "Navy", value: "#1E3A8A" },
  { name: "Amber", value: "#B45309" },
  { name: "Teal", value: "#0F766E" },
  { name: "Charcoal", value: "#27272A" },
] as const;

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

const fieldClass =
  "w-full rounded-lg border border-neutral-400/30 bg-neutral-500/5 px-3 py-2.5 text-[0.95rem] outline-none transition placeholder:text-neutral-500 focus:border-[#F6A700] focus:ring-2 focus:ring-[#F6A700]/30";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#F6A700] px-6 py-2.5 text-sm font-bold text-black transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6A700] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-400/40 px-5 py-2.5 text-sm font-semibold transition hover:border-[#F6A700] hover:text-[#F6A700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6A700] disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold">
        {label}
        {hint ? <span className="ml-1.5 font-normal opacity-60">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function EntryCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-neutral-400/25 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <legend className="text-base font-bold">{title}</legend>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full px-3 py-1 text-xs font-semibold opacity-70 transition hover:bg-red-500/10 hover:text-red-500 hover:opacity-100"
          >
            Remove
          </button>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function AddButton({ onClick, children, disabled }: { onClick: () => void; children: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl border border-dashed border-neutral-400/40 py-3 text-sm font-semibold transition hover:border-[#F6A700] hover:text-[#F6A700] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function patchAt<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

type ErrorState = { message: string; offerPlain: boolean } | null;

export default function ResumeBuilder() {
  const [input, setInput] = useState<ResumeInput>(emptyInput);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [usedAi, setUsedAi] = useState(false);
  const [editing, setEditing] = useState(false);
  const [accent, setAccent] = useState<string>(ACCENTS[0].value);

  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<ErrorState>(null);

  const topRef = useRef<HTMLDivElement>(null);

  /* ---------- draft persistence (this browser only) ---------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const restored = cleanInput(JSON.parse(raw));
        if (!restored.experience.length) restored.experience = [emptyExperience()];
        if (!restored.education.length) restored.education = [emptyEducation()];
        setInput(restored);
      }
    } catch {
      /* corrupt or blocked storage: start fresh */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(input));
      } catch {
        /* storage full or blocked: drafts just won't persist */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [input, hydrated]);

  /* ---------- helpers ---------- */

  const set = <K extends keyof ResumeInput>(key: K, value: ResumeInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const scrollToTop = () => {
    const el = topRef.current;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" });
  };

  const goTo = (next: number) => {
    setStep(next);
    setError(null);
    scrollToTop();
  };

  const clearDraft = () => {
    if (!window.confirm("Clear everything you've typed and start over?")) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setInput(emptyInput());
    setResume(null);
    setStep(0);
    setError(null);
  };

  /* ---------- generate ---------- */

  const showResult = (data: ResumeData, ai: boolean) => {
    setResume(data);
    setUsedAi(ai);
    setEditing(false);
    setError(null);
    scrollToTop();
  };

  const buildPlain = () => {
    const cleaned = cleanInput(input);
    const problem = validateForGenerate(cleaned);
    if (problem) return setError({ message: problem, offerPlain: false });
    showResult(assembleResume(cleaned, null), false);
  };

  const generate = async () => {
    const cleaned = cleanInput(input);
    const problem = validateForGenerate(cleaned);
    if (problem) return setError({ message: problem, offerPlain: false });

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Name and contact details never leave the browser.
        body: JSON.stringify(withoutContactDetails(cleaned)),
      });
      const data = (await res.json().catch(() => ({}))) as { ai?: AiResumeContent; error?: string };
      if (!res.ok || !data.ai) {
        setError({
          message: data.error || "The AI writer couldn't finish this one. Try again, or build without AI.",
          offerPlain: true,
        });
        return;
      }
      showResult(assembleResume(cleaned, data.ai), true);
    } catch {
      setError({ message: "Couldn't reach the server. Check your connection and try again.", offerPlain: true });
    } finally {
      setGenerating(false);
    }
  };

  /* ---------- download ---------- */

  const download = async () => {
    if (!resume) return;
    setDownloading(true);
    setError(null);
    try {
      const { renderResumePdf } = await import("./ResumePDF");
      const blob = await renderResumePdf(resume, accent);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resumeFileName(resume.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error("[resume] PDF render failed", err);
      setError({ message: "The PDF couldn't be created. Refresh the page and try again.", offerPlain: false });
    } finally {
      setDownloading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Result view                                                         */
  /* ------------------------------------------------------------------ */

  if (resume) {
    return (
      <div ref={topRef} className="space-y-6">
        <div className="glass flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-lg font-bold">Your resume is ready</p>
            <p className="text-sm opacity-70">
              {usedAi
                ? "Read it through and fix anything that isn't quite right before you download."
                : "Built straight from your notes, without AI. Edit the wording if you like, then download."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setResume(null)}>
              Back to form
            </button>
            <button
              type="button"
              className={secondaryBtn}
              aria-pressed={editing}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Done editing" : "Edit wording"}
            </button>
            <button type="button" className={primaryBtn} onClick={download} disabled={downloading}>
              {downloading ? "Creating PDF…" : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Resume colour">
          <span className="text-sm font-semibold">Colour</span>
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={accent === a.value}
              aria-label={a.name}
              title={a.name}
              onClick={() => setAccent(a.value)}
              className={`h-7 w-7 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6A700] focus-visible:ring-offset-2 ${
                accent === a.value ? "scale-110 border-[#F6A700]" : "border-transparent"
              }`}
              style={{ backgroundColor: a.value }}
            />
          ))}
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
        ) : null}

        <div className={editing ? "grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]" : ""}>
          {editing ? (
            <div className="glass h-fit rounded-3xl p-4 sm:p-6">
              <ResumeEditor value={resume} onChange={setResume} />
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <ResumePreview data={resume} accent={accent} />
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Form view                                                           */
  /* ------------------------------------------------------------------ */

  const isLast = step === STEPS.length - 1;

  return (
    <div ref={topRef} className="glass rounded-3xl p-4 sm:p-8">
      {/* Step indicator */}
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const state = i === step ? "current" : i < step ? "done" : "todo";
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={state === "current" ? "step" : undefined}
                className="group w-full text-left focus-visible:outline-none"
              >
                <span
                  className={`block h-1.5 rounded-full transition-colors ${
                    state === "todo" ? "bg-neutral-400/25" : "bg-[#F6A700]"
                  } group-focus-visible:ring-2 group-focus-visible:ring-[#F6A700]/50`}
                />
                <span
                  className={`mt-2 hidden text-xs font-semibold sm:block ${state === "current" ? "" : "opacity-55"}`}
                >
                  {i + 1}. {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <h2 className="mb-1 text-xl font-bold sm:text-2xl">{STEPS[step]}</h2>
      <p className="mb-6 text-sm opacity-70">
        {step === 0 && "The basics employers see first. Your name and contact details stay in your browser."}
        {step === 1 &&
          "Jobs, internships, freelance work or volunteering. Rough notes are fine. The AI turns them into clear bullet points but won't add anything you didn't write."}
        {step === 2 && "Degrees, courses and anything you've built or designed."}
        {step === 3 && "Paste a job posting if you're applying for something specific, and the wording will lean towards it."}
      </p>

      {/* ---------- Step 1: About you ---------- */}
      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              className={fieldClass}
              value={input.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              autoComplete="name"
              maxLength={LIMITS.short}
            />
          </Field>
          <Field label="Role you're aiming for" hint="optional">
            <input
              className={fieldClass}
              value={input.targetRole}
              onChange={(e) => set("targetRole", e.target.value)}
              placeholder="e.g. Junior Data Analyst"
              maxLength={LIMITS.short}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={fieldClass}
              value={input.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              maxLength={LIMITS.short}
            />
          </Field>
          <Field label="Phone" hint="optional">
            <input
              type="tel"
              className={fieldClass}
              value={input.phone}
              onChange={(e) => set("phone", e.target.value)}
              autoComplete="tel"
              maxLength={40}
            />
          </Field>
          <Field label="City, country" hint="optional">
            <input
              className={fieldClass}
              value={input.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Islamabad, Pakistan"
              autoComplete="address-level2"
              maxLength={LIMITS.short}
            />
          </Field>
          <Field label="Links" hint="LinkedIn, portfolio, GitHub — one per line">
            <textarea
              className={fieldClass}
              rows={2}
              value={input.links}
              onChange={(e) => set("links", e.target.value)}
              placeholder="linkedin.com/in/yourname"
            />
          </Field>
          <Field label="About you" hint="optional — a few lines in your own words" className="sm:col-span-2">
            <textarea
              className={fieldClass}
              rows={4}
              value={input.summaryNotes}
              onChange={(e) => set("summaryNotes", e.target.value)}
              placeholder="What you do, what you're good at, what you're looking for next."
              maxLength={LIMITS.notes}
            />
          </Field>
        </div>
      )}

      {/* ---------- Step 2: Experience ---------- */}
      {step === 1 && (
        <div className="space-y-4">
          {input.experience.map((exp, i) => (
            <EntryCard
              key={i}
              title={exp.role || exp.company || `Position ${i + 1}`}
              onRemove={() => set("experience", removeAt(input.experience, i))}
            >
              <Field label="Job title">
                <input
                  className={fieldClass}
                  value={exp.role}
                  onChange={(e) => set("experience", patchAt(input.experience, i, { role: e.target.value }))}
                  maxLength={LIMITS.short}
                />
              </Field>
              <Field label="Company or organisation">
                <input
                  className={fieldClass}
                  value={exp.company}
                  onChange={(e) => set("experience", patchAt(input.experience, i, { company: e.target.value }))}
                  maxLength={LIMITS.short}
                />
              </Field>
              <Field label="Start" hint="e.g. Jan 2024">
                <input
                  className={fieldClass}
                  value={exp.start}
                  onChange={(e) => set("experience", patchAt(input.experience, i, { start: e.target.value }))}
                  maxLength={30}
                />
              </Field>
              <Field label="End">
                <input
                  className={fieldClass}
                  value={exp.current ? "Present" : exp.end}
                  disabled={exp.current}
                  onChange={(e) => set("experience", patchAt(input.experience, i, { end: e.target.value }))}
                  maxLength={30}
                />
              </Field>
              <Field label="Location" hint="optional">
                <input
                  className={fieldClass}
                  value={exp.location}
                  onChange={(e) => set("experience", patchAt(input.experience, i, { location: e.target.value }))}
                  maxLength={LIMITS.short}
                />
              </Field>
              <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#F6A700]"
                  checked={exp.current}
                  onChange={(e) => set("experience", patchAt(input.experience, i, { current: e.target.checked }))}
                />
                I work here now
              </label>
              <Field label="What did you do?" hint="rough notes, one per line" className="sm:col-span-2">
                <textarea
                  className={fieldClass}
                  rows={5}
                  value={exp.notes}
                  onChange={(e) => set("experience", patchAt(input.experience, i, { notes: e.target.value }))}
                  placeholder={"handled the shop's instagram, grew followers from 2k to 9k\nmade weekly sales reports in excel"}
                  maxLength={LIMITS.notes}
                />
              </Field>
            </EntryCard>
          ))}
          <AddButton
            onClick={() => set("experience", [...input.experience, emptyExperience()])}
            disabled={input.experience.length >= LIMITS.experience}
          >
            Add a position
          </AddButton>
          {input.experience.length === 0 ? (
            <p className="text-center text-sm opacity-70">
              No work experience yet? That&apos;s fine — skip ahead and lean on education, projects and skills.
            </p>
          ) : null}
        </div>
      )}

      {/* ---------- Step 3: Education & projects ---------- */}
      {step === 2 && (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-base font-bold">Education</h3>
            {input.education.map((edu, i) => (
              <EntryCard
                key={i}
                title={edu.degree || edu.institution || `Education ${i + 1}`}
                onRemove={() => set("education", removeAt(input.education, i))}
              >
                <Field label="Degree or qualification">
                  <input
                    className={fieldClass}
                    value={edu.degree}
                    onChange={(e) => set("education", patchAt(input.education, i, { degree: e.target.value }))}
                    placeholder="e.g. BS Computer Science"
                    maxLength={LIMITS.short}
                  />
                </Field>
                <Field label="School, college or university">
                  <input
                    className={fieldClass}
                    value={edu.institution}
                    onChange={(e) => set("education", patchAt(input.education, i, { institution: e.target.value }))}
                    maxLength={LIMITS.short}
                  />
                </Field>
                <Field label="Start">
                  <input
                    className={fieldClass}
                    value={edu.start}
                    onChange={(e) => set("education", patchAt(input.education, i, { start: e.target.value }))}
                    maxLength={30}
                  />
                </Field>
                <Field label="End" hint="or expected">
                  <input
                    className={fieldClass}
                    value={edu.end}
                    onChange={(e) => set("education", patchAt(input.education, i, { end: e.target.value }))}
                    maxLength={30}
                  />
                </Field>
                <Field label="Details" hint="optional — CGPA, thesis, awards" className="sm:col-span-2">
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={edu.details}
                    onChange={(e) => set("education", patchAt(input.education, i, { details: e.target.value }))}
                    maxLength={LIMITS.notes}
                  />
                </Field>
              </EntryCard>
            ))}
            <AddButton
              onClick={() => set("education", [...input.education, emptyEducation()])}
              disabled={input.education.length >= LIMITS.education}
            >
              Add education
            </AddButton>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold">Projects</h3>
            {input.projects.map((p, i) => (
              <EntryCard
                key={i}
                title={p.name || `Project ${i + 1}`}
                onRemove={() => set("projects", removeAt(input.projects, i))}
              >
                <Field label="Project name">
                  <input
                    className={fieldClass}
                    value={p.name}
                    onChange={(e) => set("projects", patchAt(input.projects, i, { name: e.target.value }))}
                    maxLength={LIMITS.short}
                  />
                </Field>
                <Field label="Link" hint="optional">
                  <input
                    className={fieldClass}
                    value={p.link}
                    onChange={(e) => set("projects", patchAt(input.projects, i, { link: e.target.value }))}
                    maxLength={LIMITS.link}
                  />
                </Field>
                <Field label="What was it, and what did you do?" className="sm:col-span-2">
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={p.notes}
                    onChange={(e) => set("projects", patchAt(input.projects, i, { notes: e.target.value }))}
                    maxLength={LIMITS.notes}
                  />
                </Field>
              </EntryCard>
            ))}
            <AddButton
              onClick={() => set("projects", [...input.projects, emptyProject()])}
              disabled={input.projects.length >= LIMITS.projects}
            >
              Add a project
            </AddButton>
          </div>
        </div>
      )}

      {/* ---------- Step 4: Skills & target job ---------- */}
      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Skills" hint="separate with commas" className="sm:col-span-2">
            <textarea
              className={fieldClass}
              rows={3}
              value={input.skills}
              onChange={(e) => set("skills", e.target.value)}
              placeholder="Excel, Python, Canva, public speaking, customer service"
              maxLength={LIMITS.list}
            />
          </Field>
          <Field label="Languages" hint="optional">
            <input
              className={fieldClass}
              value={input.languages}
              onChange={(e) => set("languages", e.target.value)}
              placeholder="English, Urdu"
              maxLength={300}
            />
          </Field>
          <Field label="Certifications" hint="optional, one per line">
            <textarea
              className={fieldClass}
              rows={2}
              value={input.certifications}
              onChange={(e) => set("certifications", e.target.value)}
              maxLength={LIMITS.list}
            />
          </Field>
          <Field label="Job posting" hint="optional — paste the description" className="sm:col-span-2">
            <textarea
              className={fieldClass}
              rows={6}
              value={input.jobDescription}
              onChange={(e) => set("jobDescription", e.target.value)}
              maxLength={LIMITS.jobDescription}
            />
          </Field>
        </div>
      )}

      {/* ---------- Errors ---------- */}
      {error ? (
        <div role="alert" className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <p>{error.message}</p>
          {error.offerPlain ? (
            <button type="button" onClick={buildPlain} className="mt-2 font-bold underline underline-offset-2">
              Build without AI
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ---------- Navigation ---------- */}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-neutral-400/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button type="button" className={secondaryBtn} onClick={() => goTo(step - 1)}>
              Back
            </button>
          ) : null}
          <button type="button" onClick={clearDraft} className="text-xs font-semibold opacity-60 hover:opacity-100">
            Start over
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isLast ? (
            <>
              <button type="button" className={secondaryBtn} onClick={buildPlain} disabled={generating}>
                Build without AI
              </button>
              <button type="button" className={primaryBtn} onClick={generate} disabled={generating}>
                {generating ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black motion-reduce:animate-none"
                    />
                    Writing your resume…
                  </>
                ) : (
                  "Write my resume"
                )}
              </button>
            </>
          ) : (
            <button type="button" className={primaryBtn} onClick={() => goTo(step + 1)}>
              Next: {STEPS[step + 1]}
            </button>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed opacity-60">
        Your draft is saved in this browser only. We don&apos;t store your resume. When you use AI, your experience,
        education, projects and skills are sent to Google Gemini to write the text; your name and contact details
        never leave your device.
      </p>
    </div>
  );
}
