"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Unlock, ArrowRight } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

/**
 * Claim / release buttons for the queue. A claim is atomic on the server, so
 * if two proofreaders click at once only one wins; the other sees who did.
 */
export default function QueueAction({
  reviewId,
  action,
  goToReview = true,
  label,
  variant = "primary",
}: {
  reviewId: string;
  action: "claim" | "release";
  goToReview?: boolean;
  label?: string;
  variant?: "primary" | "ghost";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (action === "release" && !confirm("Release this so another proofreader can pick it up?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await cmsFetch(`/api/proofread/reviews/${reviewId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't work. Reload and try again.");
      if (action === "claim" && goToReview) {
        router.push(`/proofread/review/${reviewId}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const cls =
    variant === "primary"
      ? "bg-signal text-white shadow-glow hover:brightness-110"
      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={`focus-ring flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${cls}`}
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : action === "claim" ? (
          <Lock size={15} />
        ) : (
          <Unlock size={15} />
        )}
        {label ?? (action === "claim" ? "Claim & start" : "Release")}
        {action === "claim" && !busy && goToReview && <ArrowRight size={14} />}
      </button>
      {error && <p className="max-w-[16rem] text-right text-xs text-red-400">{error}</p>}
    </div>
  );
}
