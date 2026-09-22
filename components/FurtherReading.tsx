"use client";

import { useEffect, useState } from "react";
import { Compass, HelpCircle, Loader2 } from "lucide-react";

interface Insights {
  angles: string[];
  openQuestions: string[];
}

export default function FurtherReading({ title, body }: { title: string; body: string[] }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, body }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  return (
    <div className="mt-8 rounded-glass border border-black/[0.06] p-5 dark:border-white/[0.08]">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink/50 dark:text-white/40">
        AI-Suggested — Explore Further
      </p>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-ink/50 dark:text-white/40">
          <Loader2 size={14} className="animate-spin" /> Generating suggestions...
        </p>
      )}

      {error && !loading && (
        <p className="text-sm text-ink/50 dark:text-white/40">{error}</p>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-white">
              <Compass size={14} className="text-signal" /> Related angles
            </p>
            <ul className="space-y-1.5">
              {data.angles.map((a) => (
                <li key={a} className="text-sm text-ink/70 dark:text-white/70">
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-white">
              <HelpCircle size={14} className="text-signal" /> Open questions
            </p>
            <ul className="space-y-1.5">
              {data.openQuestions.map((q) => (
                <li key={q} className="text-sm text-ink/70 dark:text-white/70">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
