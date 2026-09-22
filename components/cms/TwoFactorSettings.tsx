"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

export default function TwoFactorSettings({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cmsFetch("/api/cms/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start setup");
      setSecret(data.secret);
      setQrDataUrl(await QRCode.toDataURL(data.otpauthUrl));
      setStep("setup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start setup");
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await cmsFetch("/api/cms/2fa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Incorrect code");
      onChange(true);
      setStep("idle");
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Incorrect code");
    } finally {
      setLoading(false);
    }
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await cmsFetch("/api/cms/2fa/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Incorrect password");
      onChange(false);
      setStep("idle");
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Incorrect password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass mt-5 rounded-glass p-6">
      <p className="mb-1 font-display text-base font-bold text-white">Two-Factor Authentication</p>
      <p className="mb-4 text-sm text-white/50">
        {enabled
          ? "Enabled — a 6-digit code is required at sign-in."
          : "Add an authenticator-app code as a second sign-in step."}
      </p>

      {step === "idle" && (
        <button
          onClick={enabled ? () => setStep("disable") : startSetup}
          disabled={loading}
          className={`focus-ring flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            enabled ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-signal text-white"
          }`}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : enabled ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
          {enabled ? "Disable 2FA" : "Enable 2FA"}
        </button>
      )}

      {step === "setup" && (
        <div>
          <p className="mb-3 text-sm text-white/60">
            Scan this with an authenticator app (Google Authenticator, 1Password, Authy...), or
            enter the code manually.
          </p>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="2FA QR code" className="mb-3 h-40 w-40 rounded-xl bg-white p-2" />
          )}
          <p className="mb-4 break-all rounded-lg bg-white/5 p-2 font-mono text-xs text-white/50">{secret}</p>
          <form onSubmit={confirmSetup} className="flex items-center gap-2">
            <input
              required
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="focus-ring w-32 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center font-mono tracking-widest text-white outline-none"
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="focus-ring rounded-full bg-signal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="focus-ring text-xs text-white/40 hover:text-white/70"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {step === "disable" && (
        <form onSubmit={disable} className="flex items-center gap-2">
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password"
            className="focus-ring flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="focus-ring rounded-full bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 disabled:opacity-60"
          >
            Confirm disable
          </button>
          <button
            type="button"
            onClick={() => setStep("idle")}
            className="focus-ring text-xs text-white/40 hover:text-white/70"
          >
            Cancel
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
