"use client";

import type { ResumeData } from "@/lib/resume/resume";
import { ScaledSheet } from "./ResumePreview";
import { TEMPLATES, type TemplateId } from "./templates";

// Live thumbnails: each design drawn with the person's own resume (or an
// example before they have one), cropped to the top of the page.
export default function TemplatePicker({
  value,
  onChange,
  data,
  accent,
}: {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
  data: ResumeData;
  accent: string;
}) {
  return (
    <div role="radiogroup" aria-label="Resume design" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TEMPLATES.map((t) => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t.id)}
            className={`group overflow-hidden rounded-2xl border-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6A700] focus-visible:ring-offset-2 ${
              selected ? "border-[#F6A700] shadow-[0_8px_24px_-10px_rgba(246,167,0,0.6)]" : "border-neutral-400/25 hover:border-neutral-400/60"
            }`}
          >
            <div className="pointer-events-none bg-white" aria-hidden="true">
              <ScaledSheet data={data} accent={accent} template={t.id} maxHeight={150} />
            </div>
            <div className="border-t border-neutral-400/20 px-3 py-2">
              <p className="flex items-center justify-between gap-2 text-sm font-bold">
                {t.name}
                {selected ? <span className="rounded-full bg-[#F6A700] px-2 py-0.5 text-[10px] font-bold text-black">Selected</span> : null}
              </p>
              <p className="text-[11px] leading-snug opacity-60">{t.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
