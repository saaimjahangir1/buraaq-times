"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";

export default function CmsRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<"NEWS_EDITOR" | "ARTICLE_EDITOR">("NEWS_EDITOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, bio, role }),
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
          Check your email to verify your address. An admin also needs to approve your account
          before you can publish.
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
          href="/cms/login"
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
        Editorial CMS — Registration
      </p>

      <h1 className="mt-6 font-display text-2xl font-bold text-white">Create an account</h1>

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
          <label className="mb-1 block text-xs font-medium text-white/60">Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">I want to be a...</label>
          <div className="grid grid-cols-2 gap-2">
            {(["NEWS_EDITOR", "ARTICLE_EDITOR"] as const).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`focus-ring rounded-xl border px-3 py-3 text-sm font-medium transition ${
                  role === r
                    ? "border-signal bg-signal/20 text-white"
                    : "border-white/10 bg-white/5 text-white/60"
                }`}
              >
                {r === "NEWS_EDITOR" ? "News Editor" : "Article Editor"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep py-3 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/cms/login" className="font-medium text-signal hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
