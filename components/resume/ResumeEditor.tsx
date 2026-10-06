"use client";

import { useState } from "react";
import { splitList, type ResumeData } from "@/lib/resume/resume";

// Lets people fix the AI's wording before downloading. Bullets are edited as
// "one per line" text. Blank lines are kept while typing and dropped at render time,
// so the cursor never jumps.

const fieldClass =
  "w-full rounded-lg border border-neutral-400/30 bg-neutral-500/5 px-3 py-2 text-sm leading-relaxed outline-none transition placeholder:text-neutral-500 focus:border-[#F6A700] focus:ring-2 focus:ring-[#F6A700]/30";

function skillsToText(skills: ResumeData["skills"]): string {
  return skills.map((g) => (g.category ? `${g.category}: ${g.items.join(", ")}` : g.items.join(", "))).join("\n");
}

function textToSkills(text: string): ResumeData["skills"] {
  return text
    .split("\n")
    .map((row) => {
      const idx = row.indexOf(":");
      const category = idx > -1 ? row.slice(0, idx).trim() : "";
      const items = splitList(idx > -1 ? row.slice(idx + 1) : row);
      return { category, items };
    })
    .filter((g) => g.items.length > 0);
}

function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <span className="mb-1 block text-sm font-semibold">
      {children}
      {hint ? <span className="ml-1.5 font-normal opacity-60">{hint}</span> : null}
    </span>
  );
}

export default function ResumeEditor({
  value,
  onChange,
}: {
  value: ResumeData;
  onChange: (next: ResumeData) => void;
}) {
  // Skills keep their own raw text so commas/colons can be typed freely.
  const [skillsText, setSkillsText] = useState(() => skillsToText(value.skills));

  const patch = (p: Partial<ResumeData>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-5">
      <label className="block">
        <Label>Headline</Label>
        <input className={fieldClass} value={value.headline} onChange={(e) => patch({ headline: e.target.value })} />
      </label>

      <label className="block">
        <Label>Profile</Label>
        <textarea
          className={fieldClass}
          rows={4}
          value={value.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </label>

      {value.experience.map((e, i) => (
        <label key={`exp-${i}`} className="block">
          <Label hint="one bullet per line">{`${e.role || e.company}${e.role && e.company ? `, ${e.company}` : ""}`}</Label>
          <textarea
            className={fieldClass}
            rows={Math.max(3, e.bullets.length + 1)}
            value={e.bullets.join("\n")}
            onChange={(ev) =>
              patch({
                experience: value.experience.map((x, j) => (j === i ? { ...x, bullets: ev.target.value.split("\n") } : x)),
              })
            }
          />
        </label>
      ))}

      {value.education.map((e, i) => (
        <label key={`edu-${i}`} className="block">
          <Label hint="one line each">{e.degree || e.institution}</Label>
          <textarea
            className={fieldClass}
            rows={Math.max(2, e.details.length + 1)}
            value={e.details.join("\n")}
            onChange={(ev) =>
              patch({
                education: value.education.map((x, j) => (j === i ? { ...x, details: ev.target.value.split("\n") } : x)),
              })
            }
          />
        </label>
      ))}

      {value.projects.map((p, i) => (
        <label key={`proj-${i}`} className="block">
          <Label hint="one bullet per line">{p.name}</Label>
          <textarea
            className={fieldClass}
            rows={Math.max(2, p.bullets.length + 1)}
            value={p.bullets.join("\n")}
            onChange={(ev) =>
              patch({
                projects: value.projects.map((x, j) => (j === i ? { ...x, bullets: ev.target.value.split("\n") } : x)),
              })
            }
          />
        </label>
      ))}

      <label className="block">
        <Label hint="Category: skill, skill — one group per line">Skills</Label>
        <textarea
          className={fieldClass}
          rows={4}
          value={skillsText}
          onChange={(e) => {
            setSkillsText(e.target.value);
            patch({ skills: textToSkills(e.target.value) });
          }}
        />
      </label>

      <p className="text-xs opacity-60">
        To change names, dates, companies or contact details, go back to the form. Those are never rewritten by the AI.
      </p>
    </div>
  );
}
