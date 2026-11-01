"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import type { ResumeData } from "@/lib/resume/resume";
import { getTemplate, type Prims, type Style } from "./templates";

// The resume as a white A4 sheet on screen. It draws the very same template
// as the PDF (see templates.tsx), with HTML instead of PDF building blocks,
// so what people see is what they download. Always light, like the PDF.

const PAGE_W_PT = 595.28;
const PAGE_H_PT = 841.89;
const PT_TO_PX = 96 / 72;
const PAGE_W_PX = PAGE_W_PT * PT_TO_PX;

// Numbers are PDF points; these style keys are plain numbers in CSS too.
const UNITLESS = new Set(["lineHeight", "flex", "flexGrow", "flexShrink", "opacity", "zIndex", "fontWeight"]);

const FONTS: Record<string, CSSProperties> = {
  Helvetica: { fontFamily: "Helvetica, Arial, sans-serif" },
  "Helvetica-Bold": { fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 700 },
  "Helvetica-Oblique": { fontFamily: "Helvetica, Arial, sans-serif", fontStyle: "italic" },
  "Times-Roman": { fontFamily: "'Times New Roman', Times, serif" },
  "Times-Bold": { fontFamily: "'Times New Roman', Times, serif", fontWeight: 700 },
  "Times-Italic": { fontFamily: "'Times New Roman', Times, serif", fontStyle: "italic" },
};

function css(style: Style | undefined, base: CSSProperties = {}): CSSProperties {
  const out: Record<string, unknown> = { ...base };
  if (!style) return out as CSSProperties;
  for (const [key, value] of Object.entries(style)) {
    if (key === "fontFamily") {
      Object.assign(out, FONTS[String(value)] ?? { fontFamily: String(value) });
    } else if (key === "paddingVertical" || key === "paddingHorizontal" || key === "marginVertical" || key === "marginHorizontal") {
      const v = typeof value === "number" ? `${value}pt` : value;
      const [kind, axis] = key.startsWith("padding") ? ["padding", key.slice(7)] : ["margin", key.slice(6)];
      const sides = axis === "Vertical" ? ["Top", "Bottom"] : ["Left", "Right"];
      for (const s of sides) out[`${kind}${s}`] = v;
    } else {
      out[key] = typeof value === "number" && !UNITLESS.has(key) ? `${value}pt` : value;
    }
  }
  // react-pdf borders are solid by default; CSS needs it said.
  for (const side of ["", "Top", "Bottom", "Left", "Right"]) {
    if (out[`border${side}Width`] !== undefined && out[`border${side}Style`] === undefined) out[`border${side}Style`] = "solid";
  }
  return out as CSSProperties;
}

// Inside a Txt, a Txt is an inline span (as in react-pdf).
const InText = createContext(false);

const htmlPrims: Prims = {
  Page: ({ style, children }) => (
    // pre-wrap: keep spaces exactly as the PDF does (e.g. "   |   " between contact details).
    <div style={css(style, { width: `${PAGE_W_PT}pt`, minHeight: `${PAGE_H_PT}pt`, background: "#ffffff", boxSizing: "border-box", display: "flex", flexDirection: "column", textAlign: "left", overflowWrap: "break-word" })}>
      {children}
    </div>
  ),
  // react-pdf Views are flex columns that don't shrink; match that.
  Box: ({ style, children }) => <div style={css(style, { display: "flex", flexDirection: "column", flexShrink: 0, boxSizing: "border-box" })}>{children}</div>,
  Txt: function Txt({ style, children }) {
    const inside = useContext(InText);
    return inside ? (
      <span style={css(style)}>{children}</span>
    ) : (
      <InText.Provider value={true}>
        <div style={css(style, { display: "block", boxSizing: "border-box", minWidth: 0, whiteSpace: "pre-wrap" })}>{children}</div>
      </InText.Provider>
    );
  },
  Lnk: ({ src, style, children }) => (
    <a href={src} target="_blank" rel="noopener noreferrer" style={css(style, { color: "inherit" })}>
      {children}
    </a>
  ),
};

/** The A4 sheet at its real size (595 × 842 pt). */
export function ResumeSheet({ data, accent, template }: { data: ResumeData; accent: string; template?: string }) {
  return getTemplate(template).render(data, accent, htmlPrims);
}

/** The sheet shrunk to fit its container (phones, side panels, thumbnails). */
export function ScaledSheet({
  data,
  accent,
  template,
  maxHeight,
  className = "",
}: {
  data: ResumeData;
  accent: string;
  template?: string;
  /** Crop to this many pixels (thumbnails); omit to show the whole resume. */
  maxHeight?: number;
  className?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / PAGE_W_PX);
      setScale(s);
      setHeight(inner.current.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={outer}
      className={className}
      // Inline (not utility classes) so the sheet is always clipped to this box.
      style={{ position: "relative", width: "100%", overflow: "hidden", height: maxHeight ? Math.min(maxHeight, height ?? maxHeight) : height ?? undefined }}
    >
      <div ref={inner} style={{ width: PAGE_W_PX, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        <ResumeSheet data={data} accent={accent} template={template} />
      </div>
    </div>
  );
}

export default function ResumePreview({ data, accent, template }: { data: ResumeData; accent: string; template?: string }) {
  return (
    <article aria-label="Resume preview" className="mx-auto w-full max-w-[794px] text-black shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]">
      <ScaledSheet data={data} accent={accent} template={template} />
    </article>
  );
}
