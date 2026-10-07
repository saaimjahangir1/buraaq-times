"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";

export default function ProofreadRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proofread/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setDevLink(data.devLink || null);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="glass-strong rounded-glass p-8 text-center">
        <CheckCircle2 size={32} className="mx-auto text-signal" />
        <h1 className="mt-4 font-display text-xl font-bold text-white">Account created</h1>
        <p className="mt-2 text-sm text-white/60">
          Check your email to verify your address. An admin also needs to approve your proofreader
          account — you&apos;ll get an email as soon as they do.
        </p>
        {devLink && (
          <p className="mt-4 rounded-xl bg-white/5 p-3 text-left text-xs text-white/50">
            <span className="font-semibold text-white/70">Dev mode (no SMTP configured):</span>{" "}
            <a href={devLink} className="break-all text-signal underline">
              {devLink}
            </a>
          </p>
        )}
        <Link
          href="/proofread/login"
          className="focus-ring mt-6 inline-block rounded-full bg-signal px-6 py-2.5 text-sm font-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-glass p-8">
      <Link href="/" className="flex items-center">
        <BrandMark width={130} height={38} />
      </Link>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/40">
        Proofreading desk — Registration
      </p>

      <h1 className="mt-6 font-display text-2xl font-bold text-white">Join as a proofreader</h1>
      <p className="mt-1 text-sm text-white/50">
        Proofreaders check news and articles before they go live. An admin approves every new account.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">Full name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
        </div>
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
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">
            Password <span className="text-white/30">(min 8 characters)</span>
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
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">
            About you <span className="text-white/30">(optional — your editing or language background)</span>
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep py-3 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          Request access
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/proofread/login" className="font-medium text-signal hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
