"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Missing verification token.");
      return;
    }
    fetch("/api/cms/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");
        setState("ok");
      })
      .catch((e) => {
        setState("error");
        setError(e instanceof Error ? e.message : "Verification failed");
      });
  }, [token]);

  return (
    <div className="glass-strong rounded-glass p-8 text-center">
      {state === "loading" && <Loader2 size={32} className="mx-auto animate-spin text-signal" />}
      {state === "ok" && <CheckCircle2 size={32} className="mx-auto text-signal" />}
      {state === "error" && <XCircle size={32} className="mx-auto text-red-400" />}

      <h1 className="mt-4 font-display text-xl font-bold text-white">
        {state === "loading" ? "Verifying..." : state === "ok" ? "Email verified" : "Verification failed"}
      </h1>
      <p className="mt-2 text-sm text-white/60">
        {state === "ok"
          ? "Your email is confirmed. You can sign in now."
          : state === "error"
          ? error
          : ""}
      </p>
      {state !== "loading" && (
        <Link
          href="/cms/login"
          className="focus-ring mt-6 inline-block rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-white"
        >
          Go to sign in
        </Link>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
