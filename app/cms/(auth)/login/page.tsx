"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { LogIn, Loader2, ShieldCheck } from "lucide-react";

export default function CmsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (data.requires2FA) {
        setTempToken(data.tempToken);
        return;
      }
      router.push("/cms");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const submit2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/auth/login-2fa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Incorrect code");
      router.push("/cms");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code");
    } finally {
      setLoading(false);
    }
  };

  if (tempToken) {
    return (
      <div className="glass-strong rounded-glass p-8">
        <ShieldCheck size={28} className="text-signal" />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Two-factor code</h1>
        <p className="mt-2 text-sm text-white/50">
          Enter the 6-digit code from your authenticator app.
        </p>
        <form onSubmit={submit2fa} className="mt-6 space-y-4">
          <input
            required
            autoFocus
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-lg tracking-[0.5em] text-white outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep py-3 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Verify
          </button>
          <button
            type="button"
            onClick={() => {
              setTempToken(null);
              setCode("");
              setError(null);
            }}
            className="focus-ring w-full text-center text-xs text-white/40 hover:text-white/70"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-glass p-8">
      <Link href="/" className="flex items-center">
        <BrandMark width={130} height={38} />
      </Link>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/40">
        Editorial CMS
      </p>

      <h1 className="mt-6 font-display text-2xl font-bold text-white">Sign in</h1>

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
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-medium text-white/60">Password</label>
            <Link href="/cms/forgot-password" className="text-xs text-signal hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-white/50">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="accent-signal"
          />
          Remember me
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep py-3 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        New here?{" "}
        <Link href="/cms/register" className="font-medium text-signal hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
