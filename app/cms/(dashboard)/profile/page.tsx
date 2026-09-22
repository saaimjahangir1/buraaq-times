"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2, MailWarning } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";
import TwoFactorSettings from "@/components/cms/TwoFactorSettings";

interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  bio: string | null;
  totpEnabled: boolean;
  emailVerified: boolean;
}

export default function CmsProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/cms/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user);
        setName(d.user?.name || "");
        setBio(d.user?.bio || "");
      });
  }, []);

  const save = async () => {
    if (!me) return;
    setSaving(true);
    await cmsFetch(`/api/cms/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, bio }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!me) return <div className="text-white/40">Loading...</div>;

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-white">My Profile</h1>

      <div className="glass mt-5 space-y-4 rounded-glass p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep font-display text-lg font-bold text-white">
            {me.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-white">{me.name}</p>
            <p className="text-xs text-white/40">{me.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/60">{me.role}</span>
          <span className="rounded-full bg-signal/20 px-2.5 py-1 text-signal">{me.status}</span>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${
              me.emailVerified ? "bg-signal/20 text-signal" : "bg-amber-500/20 text-amber-400"
            }`}
          >
            {me.emailVerified ? <CheckCircle2 size={12} /> : <MailWarning size={12} />}
            {me.emailVerified ? "Email verified" : "Email unverified"}
          </span>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-white/50">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/50">Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="focus-ring flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saved ? "Saved" : "Save changes"}
        </button>
      </div>

      <TwoFactorSettings
        enabled={me.totpEnabled}
        onChange={(enabled) => setMe({ ...me, totpEnabled: enabled })}
      />
    </div>
  );
}
