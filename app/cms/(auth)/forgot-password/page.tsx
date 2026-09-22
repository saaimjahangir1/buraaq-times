"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/cms/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setDevLink(data.devLink || null);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-strong rounded-glass p-8">
      <Link href="/" className="flex items-center">
        <BrandMark width={130} height={38} />
      </Link>
      <h1 className="mt-6 font-display text-2xl font-bold text-white">Reset your password</h1>

      {done ? (
        <div className="mt-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-signal" />
          <p className="mt-3 text-sm text-white/60">
            If an account exists for that email, a reset link has been sent.
          </p>
          {devLink && (
            <p className="mt-3 rounded-xl bg-white/5 p-3 text-left text-xs text-white/50">
              <span className="font-semibold text-white/70">Dev mode (no SMTP configured):</span>{" "}
              <a href={devLink} className="break-all text-signal underline">
                {devLink}
              </a>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep py-3 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            Send reset link
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-white/50">
        <Link href="/cms/login" className="font-medium text-signal hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
