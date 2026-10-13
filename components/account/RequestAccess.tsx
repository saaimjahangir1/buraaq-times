"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

type Kind = "PROOFREADER" | "NEWS_EDITOR" | "ARTICLE_EDITOR";

const LABELS: Record<Kind, string> = {
  PROOFREADER: "Request proofreader access",
  NEWS_EDITOR: "Write news",
  ARTICLE_EDITOR: "Write articles",
};

/** Buttons for asking an admin for the other kind of access on the same account. */
export default function RequestAccess({ kinds }: { kinds: Kind[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const request = async (kind: Kind) => {
    setBusy(kind);
    setMessage(null);
    try {
      const res = await cmsFetch("/api/account/request-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage({ ok: res.ok, text: data.message || data.error || (res.ok ? "Request sent." : "That didn't work.") });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => request(k)}
            disabled={busy !== null}
            className="lg-droplet focus-ring flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy === k && <Loader2 size={15} className="animate-spin" />}
            {LABELS[k]}
          </button>
        ))}
      </div>
      {message && (
        <p className={`text-sm ${message.ok ? "text-signal" : "text-red-400"}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
