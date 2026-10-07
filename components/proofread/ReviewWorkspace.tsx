"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Loader2,
  ExternalLink,
  CalendarClock,
  AlertTriangle,
  ImagePlus,
  Undo2,
  SpellCheck,
  X,
} from "lucide-react";
import EditorToolbar from "@/components/cms/EditorToolbar";
import { cmsFetch } from "@/lib/cms-fetch";
import { claimExpiresAt, hoursLeft, timeAgo, typeLabel } from "@/lib/proofread-policy";

interface ReviewProps {
  id: string;
  status: string;
  title: string;
  summary: string;
  bodyHtml: string;
  isUpdate: boolean;
  targetStatus: string;
  scheduledAt: string | null;
  createdAt: string;
  claimedAt: string | null;
  lastActivityAt: string | null;
  decidedAt: string | null;
  rejectReason: string | null;
  submittedBy: string;
  claimedBy: string | null;
}

interface FieldProps {
  categoryId: string | null;
  tagNames: string[];
  featuredImageUrl: string | null;
  brandedFeaturedImageUrl: string | null;
  brandedSocialImageUrl: string | null;
}

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error"; message: string };

const fieldCls =
  "focus-ring w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 disabled:opacity-80";

export default function ReviewWorkspace({
  review,
  post,
  fields,
  categoryName,
  changed,
  canEdit: canEditInitially,
  canClaim,
  canRelease,
}: {
  review: ReviewProps;
  post: { type: string; liveUrl: string | null };
  fields: FieldProps;
  categoryName: string | null;
  changed: string[];
  canEdit: boolean;
  canClaim: boolean;
  canRelease: boolean;
}) {
  const router = useRouter();
  // Becomes false if the server says the claim was lost (expired / released by an admin).
  const [canEdit, setCanEdit] = useState(canEditInitially);
  const [title, setTitle] = useState(review.title);
  const [summary, setSummary] = useState(review.summary);
  const [branded, setBranded] = useState({
    hero: fields.brandedFeaturedImageUrl,
    social: fields.brandedSocialImageUrl,
  });
  const [brandedTitle, setBrandedTitle] = useState(review.title);
  const [regenerating, setRegenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [busy, setBusy] = useState<null | "approve" | "reject" | "release" | "claim">(null);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [lastActivity, setLastActivity] = useState(review.lastActivityAt);
  // Bumped on every change, so a save that finishes while the proofreader is
  // still typing doesn't mark the newer text as saved.
  const changeTick = useRef(0);
  const [version, setVersion] = useState(0);
  const markDirty = useCallback(() => {
    changeTick.current += 1;
    setVersion(changeTick.current);
    setDirty(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TiptapImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      CharacterCount,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: review.bodyHtml,
    editable: canEditInitially,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[420px] px-5 py-4 focus:outline-none prose-headings:font-display prose-a:text-signal",
      },
    },
    onUpdate: () => markDirty(),
  });

  useEffect(() => {
    if (editor && editor.isEditable !== canEdit) editor.setEditable(canEdit);
  }, [editor, canEdit]);

  const edits = useCallback(
    () => ({
      title,
      summary,
      bodyHtml: editor?.getHTML() ?? review.bodyHtml,
      brandedFeaturedImageUrl: branded.hero,
      brandedSocialImageUrl: branded.social,
    }),
    [title, summary, editor, review.bodyHtml, branded]
  );

  const saveNow = useCallback(async () => {
    if (!canEdit) return true;
    setSave({ kind: "saving" });
    const tickAtStart = changeTick.current;
    try {
      const res = await cmsFetch(`/api/proofread/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(edits()),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 || res.status === 404) {
        setCanEdit(false);
        setError(data.error || "You no longer have this claimed.");
        setSave({ kind: "error", message: "Not saved" });
        return false;
      }
      if (!res.ok) throw new Error(data.error || "Couldn't save");
      if (changeTick.current === tickAtStart) setDirty(false);
      const at = new Date(data.savedAt ?? Date.now());
      setLastActivity(at.toISOString());
      setSave({ kind: "saved", at });
      return true;
    } catch (e) {
      setSave({ kind: "error", message: e instanceof Error ? e.message : "Couldn't save" });
      return false;
    }
  }, [canEdit, edits, review.id]);

  // Autosave 2.5s after the last change — this also keeps the claim alive.
  useEffect(() => {
    if (!dirty || !canEdit) return;
    const t = setTimeout(() => {
      saveNow();
    }, 2500);
    return () => clearTimeout(t);
  }, [version, dirty, canEdit, saveNow]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty || !canEdit) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, canEdit]);

  const act = async (action: "approve" | "reject" | "release" | "claim") => {
    setBusy(action);
    setError(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "approve" || action === "reject") Object.assign(body, edits());
      if (action === "reject") body.reason = reason;
      const res = await cmsFetch(`/api/proofread/reviews/${review.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && action !== "claim") setCanEdit(false);
        throw new Error(data.error || "That didn't work. Reload and try again.");
      }
      setDirty(false);
      if (action === "claim") {
        router.refresh();
        return;
      }
      const done =
        action === "approve" ? (review.targetStatus === "SCHEDULED" ? "scheduled" : "approved") : action === "reject" ? "rejected" : "released";
      router.push(`/proofread?done=${done}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  };

  const approve = () => {
    const when =
      review.targetStatus === "SCHEDULED" && review.scheduledAt
        ? `It will go live on ${new Date(review.scheduledAt).toLocaleString()}.`
        : review.isUpdate
        ? "Your corrected version replaces the live one immediately."
        : "It goes live on the site immediately.";
    if (!confirm(`Approve “${title}”?\n\n${when}`)) return;
    act("approve");
  };

  const regenerateBranded = async () => {
    if (!fields.featuredImageUrl) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await cmsFetch("/api/cms/branded-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceUrl: fields.featuredImageUrl, title, categoryId: fields.categoryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't generate the images");
      setBranded({ hero: data.heroUrl, social: data.socialUrl });
      setBrandedTitle(title);
      markDirty();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate the images");
    } finally {
      setRegenerating(false);
    }
  };

  const headlineChangedSinceImages = Boolean(branded.hero) && title.trim() !== brandedTitle.trim();
  const words = editor?.storage.characterCount.words() ?? 0;
  const decided = ["APPROVED", "REJECTED", "CANCELLED", "DISMISSED"].includes(review.status);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_330px]">
      <div className="min-w-0">
        {/* State banner */}
        {canEdit ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-white/80">
              <SpellCheck size={16} className="text-signal" /> You have this claimed. Changes save automatically.
            </span>
            <span className="text-xs text-white/50">
              {save.kind === "saving"
                ? "Saving…"
                : save.kind === "saved"
                ? `Saved ${save.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : save.kind === "error"
                ? <span className="text-red-400">{save.message}</span>
                : dirty
                ? "Unsaved changes"
                : `Claim: ${hoursLeft(claimExpiresAt(lastActivity))}`}
            </span>
          </div>
        ) : canClaim ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm">
            <span className="text-amber-100">Nobody has claimed this yet. Claim it to start editing.</span>
            <button
              onClick={() => act("claim")}
              disabled={busy !== null}
              className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy === "claim" ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Claim & start
            </button>
          </div>
        ) : review.status === "CLAIMED" ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-white/80">
            <Lock size={16} className="text-cyan" /> {review.claimedBy ?? "Another proofreader"} is proofreading this
            {review.claimedAt ? ` (since ${timeAgo(review.claimedAt)})` : ""}. You can read it, but not change it.
          </div>
        ) : decided ? (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              review.status === "APPROVED"
                ? "border-signal/30 bg-signal/10 text-white/80"
                : review.status === "REJECTED"
                ? "border-red-400/30 bg-red-500/10 text-white/80"
                : "border-white/10 bg-white/5 text-white/60"
            }`}
          >
            <p className="flex items-center gap-2 font-semibold">
              {review.status === "APPROVED" ? (
                <>
                  <CheckCircle2 size={16} className="text-signal" /> Approved by {review.claimedBy ?? "a proofreader"}
                </>
              ) : review.status === "REJECTED" ? (
                <>
                  <XCircle size={16} className="text-red-400" /> Returned by {review.claimedBy ?? "a proofreader"}
                </>
              ) : (
                <>
                  <Undo2 size={16} /> Withdrawn by the editor
                </>
              )}
              {review.decidedAt ? <span className="font-normal text-white/40">· {timeAgo(review.decidedAt)}</span> : null}
            </p>
            {review.rejectReason && (
              <p className="mt-2 whitespace-pre-line rounded-lg bg-black/20 px-3 py-2 text-white/75">{review.rejectReason}</p>
            )}
          </div>
        ) : null}

        {error && (
          <p className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <label className="mb-1 block text-xs font-medium text-white/50">Headline</label>
        <input
          value={title}
          disabled={!canEdit}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          className={`${fieldCls} mb-3 font-display text-xl font-bold`}
        />
        <label className="mb-1 block text-xs font-medium text-white/50">Summary</label>
        <textarea
          value={summary}
          disabled={!canEdit}
          rows={2}
          onChange={(e) => {
            setSummary(e.target.value);
            markDirty();
          }}
          className={`${fieldCls} mb-4 text-sm`}
        />

        {canEdit && <EditorToolbar editor={editor} />}
        <div className={`border border-white/10 bg-white/[0.02] ${canEdit ? "rounded-b-glass" : "rounded-glass"}`}>
          <EditorContent editor={editor} />
        </div>
        <p className="mt-2 text-right text-xs text-white/30">
          {words.toLocaleString()} words · {Math.max(1, Math.round(words / 200))} min read
        </p>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        {canEdit && (
          <div className="glass rounded-glass p-5">
            <p className="mb-3 font-display text-sm font-bold text-white">Decision</p>
            <div className="space-y-2">
              <button
                onClick={approve}
                disabled={busy !== null}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-signal py-2.5 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
              >
                {busy === "approve" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {review.targetStatus === "SCHEDULED" ? "Approve & schedule" : "Approve & publish"}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={busy !== null}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-red-500/15 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
              >
                <XCircle size={15} /> Return to editor
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Release this so another proofreader can pick it up? Your corrections so far are kept.")) return;
                  if (dirty) await saveNow();
                  act("release");
                }}
                disabled={busy !== null}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-medium text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-60"
              >
                {busy === "release" ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />} Release
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
              Your claim lasts 24 hours from your last save. Approving publishes your corrected version.
            </p>
          </div>
        )}

        {!canEdit && canRelease && (
          <div className="glass rounded-glass p-5">
            <p className="mb-2 font-display text-sm font-bold text-white">Admin</p>
            <button
              onClick={() => {
                if (confirm(`Take this away from ${review.claimedBy ?? "the proofreader"} and put it back in the queue?`)) act("release");
              }}
              disabled={busy !== null}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Unlock size={15} /> Release claim
            </button>
          </div>
        )}

        <div className="glass rounded-glass p-5 text-sm">
          <p className="mb-3 font-display text-sm font-bold text-white">Details</p>
          <dl className="space-y-2">
            {[
              ["Type", typeLabel(post.type)],
              ["Category", categoryName ?? "None"],
              ["Editor", review.submittedBy],
              ["Submitted", timeAgo(review.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-white/40">{k}</dt>
                <dd className="truncate text-right text-white/80">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3">
              <dt className="text-white/40">On approval</dt>
              <dd className="text-right text-white/80">
                {review.targetStatus === "SCHEDULED" && review.scheduledAt ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock size={13} /> {new Date(review.scheduledAt).toLocaleString()}
                  </span>
                ) : (
                  "Goes live now"
                )}
              </dd>
            </div>
          </dl>
          {fields.tagNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fields.tagNames.map((t) => (
                <span key={t} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {review.isUpdate && (
          <div className="glass rounded-glass p-5 text-sm">
            <p className="font-display text-sm font-bold text-white">Edit to a live post</p>
            <p className="mt-1 text-white/55">
              Readers see the current version until you approve.
              {changed.length > 0 ? " The editor changed:" : " No text changes — other details like images or SEO may differ."}
            </p>
            {changed.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {changed.map((c) => (
                  <span key={c} className="rounded-full bg-cyan/15 px-2.5 py-1 text-xs font-semibold text-cyan">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {post.liveUrl && (
              <a
                href={post.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring mt-3 inline-flex items-center gap-1.5 text-signal hover:underline"
              >
                View the live version <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}

        {fields.featuredImageUrl && (
          <div className="glass rounded-glass p-5">
            <p className="mb-3 font-display text-sm font-bold text-white">Images</p>
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <NextImage src={fields.featuredImageUrl} alt="" fill unoptimized className="object-cover" />
            </div>
            {branded.hero && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <NextImage src={branded.hero} alt="Branded hero" fill unoptimized className="object-cover" />
                </div>
                {branded.social && (
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                    <NextImage src={branded.social} alt="Branded social" fill unoptimized className="object-cover" />
                  </div>
                )}
              </div>
            )}
            {canEdit && headlineChangedSinceImages && (
              <div className="mt-3 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-100">
                <p className="flex items-start gap-1.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> You changed the headline, but the branded
                  images still show the old one.
                </p>
                <button
                  onClick={regenerateBranded}
                  disabled={regenerating || title.trim().length < 3}
                  className="focus-ring mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-signal/20 py-2 text-xs font-semibold text-signal disabled:opacity-50"
                >
                  {regenerating ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                  {regenerating ? "Generating…" : "Regenerate branded images"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showReject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="glass-strong w-full max-w-lg rounded-glass p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg font-bold text-white">Return to the editor</p>
              <button onClick={() => setShowReject(false)} className="focus-ring rounded-full p-1.5 text-white/50 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/55">
              Tell {review.submittedBy.split(" ")[0]} what needs fixing. Your corrections so far go back with it
              {review.isUpdate ? ", and the live version stays as it is." : "."}
            </p>
            <textarea
              autoFocus
              rows={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. The second paragraph needs a source for the figures, and the headline is too long for social."
              className={`${fieldCls} mt-3 text-sm`}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowReject(false)}
                className="focus-ring rounded-full px-4 py-2 text-sm text-white/60 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => act("reject")}
                disabled={busy !== null || reason.trim().length < 5}
                className="focus-ring flex items-center gap-1.5 rounded-full bg-red-500/80 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === "reject" ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Return with note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
