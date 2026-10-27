"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, ExternalLink, FileText, Loader2, Trash2, Unplug, AlertTriangle, FolderOpen } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";
import type { DriveStatus } from "@/lib/google-drive";

type Row = {
  id: string;
  name: string;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  pdfSize: number;
  createdAt: string;
  saving: boolean;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" });

export default function ResumesManager({
  rows,
  total,
  drive,
  flash,
}: {
  rows: Row[];
  total: number;
  drive: DriveStatus;
  flash: { ok: boolean; text: string } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ saved: number; of: number } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(flash);
  const [deleting, setDeleting] = useState<string | null>(null);

  const saveAll = async () => {
    setBusy(true);
    setMessage(null);
    const of = total;
    let saved = 0;
    setProgress({ saved, of });
    try {
      // The server handles a few at a time; keep going until none are left.
      for (let round = 0; round < 200; round++) {
        const res = await cmsFetch("/api/cms/resumes/drive", { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as {
          saved?: number;
          remaining?: number;
          failed?: { name: string; error: string }[];
          reconnect?: boolean;
          error?: string;
        };
        if (!res.ok) {
          setMessage({ ok: false, text: data.error || "Saving to Drive failed." });
          break;
        }
        saved += data.saved ?? 0;
        setProgress({ saved, of });
        if (data.failed?.length) {
          setMessage({
            ok: false,
            text: `${saved} saved to Drive. Couldn't save ${data.failed.map((f) => f.name).join(", ")}: ${data.failed[0].error}`,
          });
          break;
        }
        if (!data.remaining || !data.saved) {
          setMessage({ ok: true, text: `${saved} resume${saved === 1 ? "" : "s"} saved to Google Drive and removed from here.` });
          break;
        }
      }
    } catch {
      setMessage({ ok: false, text: `${saved} saved. The connection dropped — press Save to Drive again to continue.` });
    } finally {
      setBusy(false);
      setProgress(null);
      router.refresh();
    }
  };

  const remove = async (r: Row) => {
    if (!confirm(`Delete ${r.name}'s resume without saving it to Drive?`)) return;
    setDeleting(r.id);
    await cmsFetch(`/api/cms/resumes/${r.id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Google Drive? Resumes already in Drive stay there; new ones wait here until it's connected again.")) return;
    await cmsFetch("/api/cms/drive/disconnect", { method: "POST" });
    router.refresh();
  };

  const connected = drive.state === "connected";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
            <FileText size={22} className="text-signal" /> Resumes
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Made with the Resume Builder on the website. Save them to Google Drive to move them out of here.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={!connected || busy || total === 0}
          className="focus-ring flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition disabled:opacity-40"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
          {busy && progress ? `Saving… ${progress.saved} of ${progress.of}` : `Save to Drive${total ? ` (${total})` : ""}`}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            message.ok ? "bg-signal/10 text-signal" : "bg-red-500/10 text-red-300"
          }`}
        >
          {message.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          {message.text}
        </p>
      )}

      {/* Drive connection */}
      <div className="glass mt-5 rounded-glass p-5">
        {drive.state === "connected" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold text-white">Google Drive connected</p>
              <p className="mt-0.5 text-white/50">
                Saving to <span className="text-white/80">{drive.email}</span> · connected by {drive.connectedBy} · every admin saves to
                this same Drive
              </p>
            </div>
            <div className="flex items-center gap-2">
              {drive.folderUrl && (
                <a
                  href={drive.folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  <FolderOpen size={14} /> Open folder
                </a>
              )}
              <button
                onClick={disconnect}
                className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white"
              >
                <Unplug size={14} /> Disconnect
              </button>
            </div>
          </div>
        ) : drive.state === "disconnected" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold text-white">Connect Google Drive</p>
              <p className="mt-0.5 text-white/50">
                Sign in with the Google account whose Drive should keep the resumes. All admins will save to that Drive.
              </p>
            </div>
            <a
              href="/api/cms/drive/connect"
              className="focus-ring flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-white/90"
            >
              Connect Google Drive
            </a>
          </div>
        ) : (
          <div className="text-sm text-white/60">
            <p className="font-semibold text-white">Google Drive isn&apos;t set up on this server yet</p>
            <p className="mt-1">
              Add <code className="text-signal">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="text-signal">GOOGLE_OAUTH_CLIENT_SECRET</code> (a
              Google Cloud OAuth client) to the VPS <code>.env</code> and to Vercel, then rebuild. Resumes are kept here until then.
            </p>
          </div>
        )}
      </div>

      {/* List */}
      <div className="glass mt-4 overflow-hidden rounded-glass">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-white/40">No resumes waiting. New ones appear here when someone uses the Resume Builder.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {r.name}
                    {r.headline && <span className="font-normal text-white/50"> · {r.headline}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {[r.email, r.phone, r.location].filter(Boolean).join(" · ") || "No contact details"} · {when(r.createdAt)} ·{" "}
                    {Math.max(1, Math.round(r.pdfSize / 1024))} KB
                  </p>
                </div>
                {r.saving ? (
                  <span className="flex items-center gap-1.5 text-xs text-white/50">
                    <Loader2 size={13} className="animate-spin" /> Saving to Drive…
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/cms/resumes/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${r.name}'s resume`}
                      className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
                    >
                      <ExternalLink size={13} /> <span className="hidden sm:inline">View PDF</span>
                    </a>
                    <button
                      onClick={() => remove(r)}
                      disabled={deleting === r.id || busy}
                      aria-label={`Delete ${r.name}'s resume`}
                      className="focus-ring rounded-full p-2 text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                    >
                      {deleting === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {total > rows.length && (
          <p className="border-t border-white/5 px-5 py-3 text-xs text-white/40">
            Showing the newest {rows.length} of {total}. Save to Drive moves all {total}.
          </p>
        )}
      </div>
    </div>
  );
}
