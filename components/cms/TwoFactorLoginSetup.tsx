"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2, ShieldCheck } from "lucide-react";

// Shown after the password step for accounts without two-factor sign-in yet.
// It's required for every account, so this step can't be skipped.
export default function TwoFactorLoginSetup({
  setupToken,
  onDone,
  onBack,
}: {
  setupToken: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cms/auth/2fa-setup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ setupToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't start the setup");
        if (cancelled) return;
        setSecret(data.secret);
        setQr(await QRCode.toDataURL(data.otpauthUrl));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't start the setup");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setupToken]);

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/auth/2fa-setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setupToken, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Incorrect code");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-strong rounded-glass p-8">
      <ShieldCheck size={28} className="text-signal" />
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Set up two-factor sign-in</h1>
      <p className="mt-2 text-sm text-white/50">
        Every Buraaq Times account now needs a code from an authenticator app when signing in. It takes a minute:
      </p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-white/60">
        <li>Install Google Authenticator, Microsoft Authenticator or Authy on your phone.</li>
        <li>In the app, add an account and scan this code.</li>
        <li>Type the 6-digit code the app shows.</li>
      </ol>

      <div className="mt-5 flex flex-col items-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code for your authenticator app" className="h-44 w-44 rounded-xl bg-white p-2" />
        ) : (
          <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-white/5">
            {!error && <Loader2 size={20} className="animate-spin text-white/40" />}
          </div>
        )}
        {secret && (
          <p className="mt-3 w-full break-all rounded-lg bg-white/5 p-2 text-center font-mono text-xs text-white/50">
            Can't scan? Enter this key: {secret}
          </p>
        )}
      </div>

      <form onSubmit={confirm} className="mt-5 space-y-4">
        <input
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          aria-label="6-digit code"
          className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-lg tracking-[0.5em] text-white outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6 || !secret}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-signal to-cyanDeep py-3 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          Turn on and sign in
        </button>
        <button type="button" onClick={onBack} className="focus-ring w-full text-center text-xs text-white/40 hover:text-white/70">
          Back to sign in
        </button>
      </form>
    </div>
  );
}
