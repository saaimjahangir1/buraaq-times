"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setDone(true);
      setTimeout(() => router.push("/cms/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-strong rounded-glass p-8">
      <Link href="/" className="flex items-center">
        <BrandMark width={130} height={38} />
      </Link>
      <h1 className="mt-6 font-display text-2xl font-bold text-white">Set a new password</h1>

      {done ? (
        <div className="mt-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-signal" />
          <p className="mt-3 text-sm text-white/60">Password updated — redirecting to sign in...</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              New password <span className="text-white/30">(min 8 characters)</span>
            </label>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !token}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep py-3 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Update password
          </button>
          {!token && <p className="text-center text-xs text-red-400">Missing reset token in URL.</p>}
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
