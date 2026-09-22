"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

export interface SeoFields {
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  tags: string;
  ogDescription: string;
  twitterDescription: string;
  slugSuggestion: string;
  readabilityScore: number | null;
  seoScore: number | null;
}

function ScoreRing({ value, label }: { value: number | null; label: string }) {
  const v = value ?? 0;
  const color = v >= 80 ? "#22D3EE" : v >= 50 ? "#2F6BFF" : "#f87171";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full font-display text-sm font-bold text-white"
        style={{ background: `conic-gradient(${color} ${v * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal">
          {value ?? "—"}
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-white/40">{label}</span>
    </div>
  );
}

export default function SeoPanel({
  title,
  summary,
  bodyHtml,
  value,
  onChange,
}: {
  title: string;
  summary: string;
  bodyHtml: string;
  value: SeoFields;
  onChange: (v: SeoFields) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extra, setExtra] = useState<{
    contentQualityScore?: number;
    headingOptimization?: string;
    keywordDensityNote?: string;
    contentLengthSuggestion?: string;
    internalLinkingSuggestions?: string[];
    imageAltSuggestion?: string;
    schemaSuggestion?: string;
    duplicateContentNote?: string;
  } | null>(null);

  const analyze = async () => {
    if (!title || !bodyHtml) {
      setError("Add a title and some body content first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await cmsFetch("/api/cms/seo-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, summary, bodyHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      onChange({
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        focusKeyword: data.focusKeyword,
        secondaryKeywords: (data.secondaryKeywords ?? []).join(", "),
        tags: (data.tags ?? []).join(", "),
        ogDescription: data.ogDescription,
        twitterDescription: data.twitterDescription,
        slugSuggestion: data.slugSuggestion,
        readabilityScore: data.readabilityScore,
        seoScore: data.seoScore,
      });
      setExtra({
        contentQualityScore: data.contentQualityScore,
        headingOptimization: data.headingOptimization,
        keywordDensityNote: data.keywordDensityNote,
        contentLengthSuggestion: data.contentLengthSuggestion,
        internalLinkingSuggestions: data.internalLinkingSuggestions,
        imageAltSuggestion: data.imageAltSuggestion,
        schemaSuggestion: data.schemaSuggestion,
        duplicateContentNote: data.duplicateContentNote,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof SeoFields, label: string, multiline = false) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-white/50">{label}</label>
      {multiline ? (
        <textarea
          rows={2}
          value={(value[key] as string) ?? ""}
          onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
      ) : (
        <input
          value={(value[key] as string) ?? ""}
          onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
      )}
    </div>
  );

  return (
    <div className="glass rounded-glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-base font-bold text-white">
          <Sparkles size={16} className="text-signal" /> AI SEO Assistant
        </p>
        <button
          onClick={analyze}
          disabled={loading}
          className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Analyze with AI
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {(value.readabilityScore !== null || value.seoScore !== null) && (
        <div className="mb-5 flex justify-around rounded-xl bg-white/[0.03] py-4">
          <ScoreRing value={value.seoScore} label="SEO Score" />
          <ScoreRing value={value.readabilityScore} label="Readability" />
          {extra?.contentQualityScore !== undefined && (
            <ScoreRing value={extra.contentQualityScore} label="Quality" />
          )}
        </div>
      )}

      <div className="space-y-3">
        {field("seoTitle", "SEO Title")}
        {field("seoDescription", "Meta Description", true)}
        {field("focusKeyword", "Focus Keyword")}
        {field("secondaryKeywords", "Secondary Keywords (comma-separated)")}
        {field("tags", "Suggested Tags (comma-separated)")}
        {field("ogDescription", "Open Graph Description", true)}
        {field("twitterDescription", "Twitter Card Description", true)}
        {field("slugSuggestion", "Suggested URL Slug")}
      </div>

      {extra && (
        <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-white/50">
          {extra.headingOptimization && <p>📐 {extra.headingOptimization}</p>}
          {extra.keywordDensityNote && <p>🔑 {extra.keywordDensityNote}</p>}
          {extra.contentLengthSuggestion && <p>📏 {extra.contentLengthSuggestion}</p>}
          {extra.imageAltSuggestion && <p>🖼️ Alt text idea: {extra.imageAltSuggestion}</p>}
          {extra.schemaSuggestion && <p>🏷️ {extra.schemaSuggestion}</p>}
          {extra.duplicateContentNote && <p>♻️ {extra.duplicateContentNote}</p>}
          {extra.internalLinkingSuggestions && extra.internalLinkingSuggestions.length > 0 && (
            <p>🔗 Link to: {extra.internalLinkingSuggestions.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
