"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

export default function ResendVerificationButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [devLink, setDevLink] = useState<string | null>(null);

  const resend = async () => {
    setState("sending");
    const res = await fetch("/api/cms/auth/resend-verification", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setDevLink(data.devLink || null);
    setState("sent");
  };

  return (
    <div>
      <button
        onClick={resend}
        disabled={state !== "idle"}
        className="focus-ring flex items-center gap-2 rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {state === "sending" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {state === "sent" ? "Email sent" : "Resend verification email"}
      </button>
      {devLink && (
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-left text-xs text-white/50">
          <span className="font-semibold text-white/70">Dev mode (no SMTP configured):</span>{" "}
          <a href={devLink} className="break-all text-signal underline">
            {devLink}
          </a>
        </p>
      )}
    </div>
  );
}
