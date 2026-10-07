"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

// A button rather than unsubscribing on page load: email security scanners open
// links automatically, and that shouldn't unsubscribe anyone.
export default function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") {
    return <p className="mt-4 font-medium text-signal">You&apos;re unsubscribed. You won&apos;t get any more emails.</p>;
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const res = await fetch("/api/newsletter/unsubscribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          }).catch(() => null);
          setState(res?.ok ? "done" : "error");
        }}
        className="focus-ring inline-flex items-center gap-2 rounded-full bg-ink/10 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-ink/15 disabled:opacity-60 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      >
        {state === "busy" && <Loader2 size={15} className="animate-spin" />}
        Unsubscribe
      </button>
      {state === "error" && <p className="mt-3 text-sm text-red-500">That didn&apos;t work. Please try again.</p>}
    </div>
  );
}
