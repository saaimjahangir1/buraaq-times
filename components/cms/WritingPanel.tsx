"use client";

import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

interface WritingResult {
  grammarNotes: string[];
  toneSuggestion: string;
  headlineSuggestions: string[];
  imagePromptSuggestion: string;
  factCheckReminders: string[];
}

export default function WritingPanel({
  title,
  bodyHtml,
  onApplyHeadline,
}: {
  title: string;
  bodyHtml: string;
  onApplyHeadline: (headline: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WritingResult | null>(null);

  const analyze = async () => {
    if (!title || !bodyHtml) {
      setError("Add a title and some body content first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await cmsFetch("/api/cms/writing-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, bodyHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-base font-bold text-white">
          <Wand2 size={16} className="text-signal" /> AI Writing Assistance
        </p>
        <button
          onClick={analyze}
          disabled={loading}
          className="focus-ring flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          Review draft
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="space-y-4 text-sm">
          {result.headlineSuggestions?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">
                Headline ideas
              </p>
              <div className="space-y-1.5">
                {result.headlineSuggestions.map((h) => (
                  <button
                    key={h}
                    onClick={() => onApplyHeadline(h)}
                    className="focus-ring block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-white/80 transition hover:bg-signal/20 hover:text-white"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.toneSuggestion && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">Tone</p>
              <p className="text-white/70">{result.toneSuggestion}</p>
            </div>
          )}

          {result.grammarNotes?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">
                Grammar &amp; clarity
              </p>
              <ul className="list-disc space-y-1 pl-4 text-white/70">
                {result.grammarNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {result.imagePromptSuggestion && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">
                Featured image idea
              </p>
              <p className="text-white/70">{result.imagePromptSuggestion}</p>
            </div>
          )}

          {result.factCheckReminders?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">
                Fact-check reminders
              </p>
              <ul className="list-disc space-y-1 pl-4 text-white/70">
                {result.factCheckReminders.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
