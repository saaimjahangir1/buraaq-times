"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import NextImage from "next/image";
import {
  Save,
  Send,
  CalendarClock,
  Archive,
  Trash2,
  Loader2,
  X,
  History,
  ImagePlus,
  SpellCheck,
  Lock,
  Undo2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import EditorToolbar from "./EditorToolbar";
import MediaPicker from "./MediaPicker";
import SeoPanel, { SeoFields } from "./SeoPanel";
import WritingPanel from "./WritingPanel";
import Select from "@/components/Select";
import { cmsFetch } from "@/lib/cms-fetch";
import { editorShouldLoadSnapshot, isLiveStatus, timeAgo } from "@/lib/proofread-policy";

interface Category {
  id: string;
  name: string;
}
interface TagOption {
  id: string;
  name: string;
}
interface Revision {
  id: string;
  title: string;
  bodyHtml: string;
  createdAt: string;
  editor: { name: string };
}

type PostStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";

interface ReviewInfo {
  id: string;
  status: "PENDING" | "CLAIMED" | "APPROVED" | "REJECTED" | "CANCELLED" | "DISMISSED";
  isUpdate: boolean;
  targetStatus: string;
  scheduledAt: string | null;
  title: string;
  summary: string;
  bodyHtml: string;
  fields: Record<string, unknown>;
  rejectReason: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  submittedBy: string;
  createdAt: string;
  decidedAt: string | null;
}

const emptySeo: SeoFields = {
  seoTitle: "",
  seoDescription: "",
  focusKeyword: "",
  secondaryKeywords: "",
  tags: "",
  ogDescription: "",
  twitterDescription: "",
  slugSuggestion: "",
  readabilityScore: null,
  seoScore: null,
};

/** Date → value for <input type="datetime-local"> in the user's own timezone. */
function toLocalInput(value: string | Date) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostEditor({ type, postId }: { type: "news" | "article"; postId?: string }) {
  const router = useRouter();
  const isNew = !postId;
  const [currentId, setCurrentId] = useState<string | undefined>(postId);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");
  const [brandedFeaturedImageUrl, setBrandedFeaturedImageUrl] = useState("");
  const [brandedSocialImageUrl, setBrandedSocialImageUrl] = useState("");
  const [generatingBranded, setGeneratingBranded] = useState(false);
  const [brandedError, setBrandedError] = useState<string | null>(null);
  const [status, setStatus] = useState<PostStatus>("DRAFT");
  const [review, setReview] = useState<ReviewInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reviewState =
    review && (review.status === "PENDING" || review.status === "CLAIMED" || review.status === "REJECTED")
      ? review.status
      : null;
  // A proofreader is working on it: nobody edits until they finish or release.
  const locked = reviewState === "CLAIMED";
  const live = isLiveStatus(status);
  const [scheduledAt, setScheduledAt] = useState("");
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [editorsPick, setEditorsPick] = useState(false);
  const [seo, setSeo] = useState<SeoFields>(emptySeo);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState<"featured" | "inline" | null>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TiptapImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      CharacterCount,
      Placeholder.configure({ placeholder: "Start writing..." }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] px-5 py-4 focus:outline-none prose-headings:font-display prose-a:text-signal",
      },
    },
  });

  // Who's editing — admins can still publish without proofreading.
  useEffect(() => {
    fetch("/api/cms/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.user?.role === "ADMIN"))
      .catch(() => setIsAdmin(false));
  }, []);

  // Load reference data
  useEffect(() => {
    fetch("/api/cms/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
    fetch("/api/cms/tags")
      .then((r) => r.json())
      .then((d) => setTagOptions(d.tags ?? []));
  }, []);

  // Load existing post
  useEffect(() => {
    if (!postId || !editor) return;
    (async () => {
      const res = await fetch(`/api/cms/posts/${postId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load post");
        setLoading(false);
        return;
      }
      const post = data.post;
      const r: ReviewInfo | null = data.review ?? null;
      setReview(r);
      // For a live post with changes waiting (or returned) by a proofreader,
      // the editor works on those changes rather than the live version.
      const fromReview = r !== null && editorShouldLoadSnapshot(post.status, r.status);
      const p = fromReview
        ? {
            ...post,
            ...r.fields,
            title: r.title,
            summary: r.summary,
            bodyHtml: r.bodyHtml,
            scheduledAt: r.scheduledAt ?? post.scheduledAt,
          }
        : post;
      setTitle(p.title);
      setSummary(p.summary);
      setCategoryId(p.categoryId || "");
      setTags(
        fromReview && Array.isArray(r!.fields.tagNames)
          ? (r!.fields.tagNames as string[])
          : (post.tags ?? []).map((t: TagOption) => t.name)
      );
      setFeaturedImageUrl(p.featuredImageUrl || "");
      setFeaturedImageAlt(p.featuredImageAlt || "");
      setBrandedFeaturedImageUrl(p.brandedFeaturedImageUrl || "");
      setBrandedSocialImageUrl(p.brandedSocialImageUrl || "");
      setStatus(post.status);
      setScheduledAt(p.scheduledAt ? toLocalInput(p.scheduledAt) : "");
      setFeatured(Boolean(p.featured));
      setTrending(Boolean(p.trending));
      setEditorsPick(Boolean(p.editorsPick));
      setSeo({
        seoTitle: p.seoTitle || "",
        seoDescription: p.seoDescription || "",
        focusKeyword: p.focusKeyword || "",
        secondaryKeywords: p.secondaryKeywords || "",
        tags: "",
        ogDescription: p.ogDescription || "",
        twitterDescription: p.twitterDescription || "",
        slugSuggestion: p.slugSuggestion || "",
        readabilityScore: p.readabilityScore,
        seoScore: p.seoScore,
      });
      editor.commands.setContent(p.bodyHtml || "");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, editor]);

  // Read-only while a proofreader has it.
  useEffect(() => {
    if (editor && editor.isEditable === locked) editor.setEditable(!locked);
  }, [editor, locked]);

  const loadRevisions = async () => {
    if (!currentId) return;
    const res = await fetch(`/api/cms/posts/${currentId}/revisions`);
    const data = await res.json();
    setRevisions(data.revisions ?? []);
    setShowHistory(true);
  };

  const buildPayload = useCallback(
    (overrides: Partial<{ status: string }> = {}) => ({
      type,
      title,
      summary,
      bodyHtml: editor?.getHTML() ?? "",
      status: overrides.status ?? status,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      categoryId: categoryId || null,
      tagNames: tags,
      featuredImageUrl: featuredImageUrl || null,
      featuredImageAlt: featuredImageAlt || null,
      brandedFeaturedImageUrl: brandedFeaturedImageUrl || null,
      brandedSocialImageUrl: brandedSocialImageUrl || null,
      seoTitle: seo.seoTitle || null,
      seoDescription: seo.seoDescription || null,
      focusKeyword: seo.focusKeyword || null,
      secondaryKeywords: seo.secondaryKeywords || null,
      ogDescription: seo.ogDescription || null,
      twitterDescription: seo.twitterDescription || null,
      slugSuggestion: seo.slugSuggestion || null,
      readabilityScore: seo.readabilityScore,
      seoScore: seo.seoScore,
      featured,
      trending,
      editorsPick,
    }),
    [
      type,
      title,
      summary,
      editor,
      status,
      scheduledAt,
      categoryId,
      tags,
      featuredImageUrl,
      featuredImageAlt,
      brandedFeaturedImageUrl,
      brandedSocialImageUrl,
      seo,
      featured,
      trending,
      editorsPick,
    ]
  );

  const save = async (
    overrideStatus?: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED",
    silent = false
  ) => {
    if (locked) return;
    if (!title.trim()) {
      setError("Add a title before saving.");
      return;
    }
    if (!silent) setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(overrideStatus ? { status: overrideStatus } : {});
      setNotice(null);

      if (!currentId) {
        const res = await cmsFetch("/api/cms/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        setCurrentId(data.post.id);
        if (data.post?.status) setStatus(data.post.status);
        router.replace(`/cms/${type === "news" ? "news" : "articles"}/${data.post.id}/edit`);
      } else {
        const res = await cmsFetch(`/api/cms/posts/${currentId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        if (data.post?.status) setStatus(data.post.status);
        // A direct save by an admin supersedes a waiting or returned submission.
        if (review && (review.status === "PENDING" || review.status === "REJECTED") && (isAdmin || overrideStatus === "ARCHIVED")) {
          setReview({ ...review, status: review.status === "PENDING" ? "CANCELLED" : "DISMISSED" });
        }
      }
      setLastSaved(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Autosave — only once the post exists and is still a draft.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!currentId || status !== "DRAFT" || loading) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(undefined, true), 2500);
    return () => clearTimeout(autosaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, summary, categoryId, tags, featuredImageUrl, seo, editor?.state.doc]);

  // Send the current version to the proofreaders (or update what's waiting).
  const submitForReview = async (targetStatus: "PUBLISHED" | "SCHEDULED") => {
    if (locked) return;
    if (!title.trim()) {
      setError("Add a title before submitting.");
      return;
    }
    if (targetStatus === "SCHEDULED" && !scheduledAt) {
      setError("Pick a date and time to schedule it for.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      let id = currentId;
      const isFirstSave = !id;
      if (!id) {
        const res = await cmsFetch("/api/cms/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildPayload({ status: "DRAFT" })),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        id = data.post.id as string;
        setCurrentId(id);
      }
      const res = await cmsFetch(`/api/cms/posts/${id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...buildPayload(),
          targetStatus,
          scheduledAt: targetStatus === "SCHEDULED" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't submit for proofreading");
      setReview(data.review);
      setStatus(data.postStatus);
      setLastSaved(new Date());
      setNotice(
        data.proofreadersEmailed
          ? `Sent for proofreading — ${data.proofreadersEmailed} proofreader${data.proofreadersEmailed === 1 ? "" : "s"} notified by email.`
          : "Sent for proofreading."
      );
      if (isFirstSave) router.replace(`/cms/${type === "news" ? "news" : "articles"}/${id}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit for proofreading");
    } finally {
      setSaving(false);
    }
  };

  const withdrawReview = async () => {
    if (!currentId || !review) return;
    const discarding = review.status === "REJECTED";
    const question = discarding
      ? "Discard these returned changes and go back to the live version?"
      : "Take this back from the proofreaders? Your text stays in the editor.";
    if (!confirm(question)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await cmsFetch(`/api/cms/posts/${currentId}/review`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't withdraw it");
      if (discarding) {
        window.location.reload();
        return;
      }
      setReview({ ...review, status: "CANCELLED" });
      setStatus(data.postStatus);
      setNotice("Withdrawn from proofreading.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't withdraw it");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!currentId || !confirm("Delete this post permanently?")) return;
    await cmsFetch(`/api/cms/posts/${currentId}`, { method: "DELETE" });
    router.push(`/cms/${type === "news" ? "news" : "articles"}`);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-white/40">Loading...</div>;
  }

  const filteredTagOptions = tagOptions.filter(
    (t) => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.name)
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-white">
            {isNew && !currentId ? `New ${type === "news" ? "News Post" : "Article"}` : "Edit"}
          </h1>
          <div className="flex items-center gap-2">
            {currentId && (
              <button
                onClick={loadRevisions}
                className="focus-ring flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10"
              >
                <History size={14} /> History
              </button>
            )}
            {lastSaved && (
              <span className="text-xs text-white/30">Saved {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        {error && <p className="mb-3 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        {notice && (
          <p className="mb-3 flex items-center gap-2 rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">
            <CheckCircle2 size={15} className="shrink-0" /> {notice}
          </p>
        )}

        {reviewState === "PENDING" && review && (
          <div className="mb-4 flex flex-wrap items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm">
            <SpellCheck size={17} className="mt-0.5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-200">Waiting for a proofreader</p>
              <p className="text-white/60">
                Submitted {timeAgo(review.createdAt)}
                {review.isUpdate ? " — the live version stays up until it's approved" : ""}. You can still change it
                until someone picks it up.
              </p>
            </div>
          </div>
        )}

        {reviewState === "CLAIMED" && review && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm">
            <Lock size={17} className="mt-0.5 shrink-0 text-cyan" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">Being proofread by {review.claimedBy ?? "a proofreader"}</p>
              <p className="text-white/60">
                Picked up {review.claimedAt ? timeAgo(review.claimedAt) : "recently"}. Editing is locked until they approve,
                return or release it.
              </p>
            </div>
          </div>
        )}

        {reviewState === "REJECTED" && review && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-300">Returned by {review.claimedBy ?? "a proofreader"}</p>
              {review.rejectReason && (
                <p className="mt-1 whitespace-pre-line rounded-lg bg-black/20 px-3 py-2 text-white/80">
                  {review.rejectReason}
                </p>
              )}
              <p className="mt-1 text-white/60">
                Their corrections are already in the text below. Fix the rest and submit it again
                {review.isUpdate ? " — the live version hasn't changed." : "."}
              </p>
            </div>
          </div>
        )}

        {!isAdmin && live && !reviewState && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs text-white/50">
            <SpellCheck size={14} className="shrink-0" /> This post is live. Your edits go to a proofreader and replace
            the live version once they&apos;re approved.
          </p>
        )}

        <input
          value={title}
          disabled={locked}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline"
          className="focus-ring mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-display text-xl font-bold text-white outline-none placeholder:text-white/30"
        />
        <textarea
          value={summary}
          disabled={locked}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          placeholder="Short summary / deck"
          className="focus-ring mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
        />

        <EditorToolbar editor={editor} onRequestImage={() => setShowMediaPicker("inline")} />
        <div className="rounded-b-glass border border-white/10 bg-white/[0.02]">
          <EditorContent editor={editor} />
        </div>
        {editor && (
          <p className="mt-2 text-right text-xs text-white/30">
            {editor.storage.characterCount.words()} words · {" "}
            {Math.max(1, Math.round(editor.storage.characterCount.words() / 200))} min read
          </p>
        )}

        <div className="mt-6 space-y-5">
          <SeoPanel
            title={title}
            summary={summary}
            bodyHtml={editor?.getHTML() ?? ""}
            value={seo}
            onChange={setSeo}
          />
          <WritingPanel title={title} bodyHtml={editor?.getHTML() ?? ""} onApplyHeadline={setTitle} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        <div className="glass rounded-glass p-5">
          <p className="mb-3 font-display text-sm font-bold text-white">Publish</p>
          <div className="space-y-2">
            {locked ? (
              <p className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-3 text-xs text-white/50">
                <Lock size={14} className="shrink-0" /> Locked while {review?.claimedBy ?? "a proofreader"} works on it.
              </p>
            ) : (
              <>
                {/* Save as draft: only for posts that aren't live or waiting (admins can always). */}
                {(isAdmin || (!live && status !== "IN_REVIEW")) && (
                  <button
                    onClick={() => save("DRAFT")}
                    disabled={saving}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Save Draft
                  </button>
                )}

                {/* The main action for everyone: send to the proofreaders. */}
                <button
                  onClick={() =>
                    submitForReview(live && status === "SCHEDULED" ? "SCHEDULED" : "PUBLISHED")
                  }
                  disabled={saving}
                  className={`focus-ring flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                    isAdmin ? "bg-white/10 hover:bg-white/20" : "bg-signal shadow-glow"
                  }`}
                >
                  {saving && !isAdmin ? <Loader2 size={15} className="animate-spin" /> : <SpellCheck size={15} />}
                  {reviewState === "PENDING"
                    ? "Update submission"
                    : live
                    ? "Submit changes for proofreading"
                    : "Submit for proofreading"}
                </button>

                {isAdmin && (
                  <button
                    onClick={() => save("PUBLISHED")}
                    disabled={saving}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-signal py-2.5 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
                  >
                    <Send size={15} /> Publish now (skip proofreading)
                  </button>
                )}

                {/* Scheduling: a new schedule needs proofreading too (admins can skip it). */}
                {(!live || isAdmin) && (
                  <>
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
                      <CalendarClock size={15} className="shrink-0 text-white/40" />
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full bg-transparent text-xs text-white outline-none"
                      />
                    </div>
                    <button
                      onClick={() => (isAdmin ? save("SCHEDULED") : submitForReview("SCHEDULED"))}
                      disabled={saving || !scheduledAt}
                      className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-cyanDeep/80 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40"
                    >
                      {isAdmin ? "Schedule Publish" : "Schedule (after proofreading)"}
                    </button>
                  </>
                )}

                {(reviewState === "PENDING" || (reviewState === "REJECTED" && live)) && (
                  <button
                    onClick={withdrawReview}
                    disabled={saving}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-white/5 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    <Undo2 size={15} />
                    {reviewState === "PENDING" ? "Withdraw from proofreading" : "Discard returned changes"}
                  </button>
                )}

                {status === "PUBLISHED" && reviewState !== "PENDING" && (
                  <button
                    onClick={() => save("ARCHIVED")}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    <Archive size={15} /> Archive
                  </button>
                )}
                {currentId && (
                  <button
                    onClick={remove}
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
              </>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-white/30">
            Current status: <span className="font-medium text-white/60">{status.replace("_", " ")}</span>
          </p>
          {isAdmin && reviewState === "PENDING" && (
            <p className="mt-1 text-center text-[11px] text-white/30">
              Publishing or saving directly will cancel the waiting submission.
            </p>
          )}
        </div>

        <div className="glass rounded-glass p-5">
          <p className="mb-3 font-display text-sm font-bold text-white">Featured Image</p>
          {featuredImageUrl ? (
            <div className="relative mb-2 aspect-video overflow-hidden rounded-xl">
              <NextImage src={featuredImageUrl} alt={featuredImageAlt} fill unoptimized className="object-cover" />
              <button
                onClick={() => {
                  setFeaturedImageUrl("");
                  setBrandedFeaturedImageUrl("");
                  setBrandedSocialImageUrl("");
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMediaPicker("featured")}
              className="focus-ring mb-2 flex aspect-video w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-sm text-white/50 hover:border-signal hover:text-white"
            >
              <ImagePlus size={16} /> Choose image
            </button>
          )}
          <input
            value={featuredImageAlt}
            onChange={(e) => setFeaturedImageAlt(e.target.value)}
            placeholder="Alt text"
            className="focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
          />

          {featuredImageUrl && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                onClick={async () => {
                  setGeneratingBranded(true);
                  setBrandedError(null);
                  try {
                    const res = await cmsFetch("/api/cms/branded-image", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ sourceUrl: featuredImageUrl, title, categoryId: categoryId || null }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Generation failed");
                    setBrandedFeaturedImageUrl(data.heroUrl);
                    setBrandedSocialImageUrl(data.socialUrl);
                  } catch (e) {
                    setBrandedError(e instanceof Error ? e.message : "Generation failed");
                  } finally {
                    setGeneratingBranded(false);
                  }
                }}
                disabled={!title.trim() || generatingBranded}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-signal/15 py-2.5 text-sm font-semibold text-signal transition hover:bg-signal/25 disabled:opacity-40"
              >
                <ImagePlus size={15} />
                {generatingBranded
                  ? "Generating…"
                  : brandedFeaturedImageUrl
                  ? "Regenerate branded images"
                  : "Generate branded images"}
              </button>
              {!title.trim() && (
                <p className="mt-1.5 text-center text-[11px] text-white/30">Add a title first.</p>
              )}
              {brandedError && <p className="mt-1.5 text-center text-[11px] text-red-400">{brandedError}</p>}

              {brandedFeaturedImageUrl && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <div className="relative aspect-video overflow-hidden rounded-lg">
                      <NextImage src={brandedFeaturedImageUrl} alt="Branded hero preview" fill unoptimized className="object-cover" />
                    </div>
                    <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-white/30">Hero (16:9)</p>
                  </div>
                  <div>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                      <NextImage src={brandedSocialImageUrl} alt="Branded social preview" fill unoptimized className="object-cover" />
                    </div>
                    <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-white/30">Social (4:5)</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass rounded-glass p-5">
          <p className="mb-3 font-display text-sm font-bold text-white">Homepage Placement</p>
          <div className="space-y-2 text-sm">
            {[
              { key: "featured" as const, label: "Featured (hero)", val: featured, set: setFeatured },
              { key: "trending" as const, label: "Trending rail", val: trending, set: setTrending },
              { key: "editorsPick" as const, label: "Editor's Pick", val: editorsPick, set: setEditorsPick },
            ].map((f) => (
              <label key={f.key} className="flex cursor-pointer items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                <span className="text-white/70">{f.label}</span>
                <input
                  type="checkbox"
                  checked={f.val}
                  onChange={(e) => f.set(e.target.checked)}
                  className="accent-signal"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="glass rounded-glass p-5">
          <p className="mb-3 font-display text-sm font-bold text-white">Category</p>
          <Select
  		value={categoryId}
  		onChange={setCategoryId}
  		placeholder="None"
  		options={[
    		  { value: "", label: "None" },
    		  ...categories.map((c) => ({ value: c.id, label: c.name })),
  		]}
		/>
        </div>

        <div className="glass relative rounded-glass p-5">
          <p className="mb-3 font-display text-sm font-bold text-white">Tags</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-signal/20 px-2.5 py-1 text-xs text-signal"
              >
                {t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag, press Enter"
            className="focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
          />
          {tagInput && filteredTagOptions.length > 0 && (
            <div className="absolute inset-x-5 z-10 mt-1 rounded-xl border border-white/10 bg-charcoal p-1.5 shadow-glass-dark">
              {filteredTagOptions.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTags([...tags, t.name]);
                    setTagInput("");
                  }}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-white/70 hover:bg-white/10"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showMediaPicker && (
        <MediaPicker
          crop={showMediaPicker === "featured"}
          onClose={() => setShowMediaPicker(null)}
          onSelect={(url, alt) => {
            if (showMediaPicker === "featured") {
              setFeaturedImageUrl(url);
              setFeaturedImageAlt(alt);
            } else {
              editor?.chain().focus().setImage({ src: url, alt }).run();
            }
            setShowMediaPicker(null);
          }}
        />
      )}

      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="glass-strong flex max-h-[80vh] w-full max-w-lg flex-col rounded-glass p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-bold text-white">Version History</p>
              <button
                onClick={() => setShowHistory(false)}
                className="focus-ring rounded-full p-1.5 text-white/50 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {revisions.length === 0 && <p className="text-sm text-white/40">No revisions yet.</p>}
              {revisions.map((r) => (
                <div key={r.id} className="rounded-xl bg-white/5 p-3 text-sm">
                  <p className="font-medium text-white/80">{r.title}</p>
                  <p className="text-xs text-white/40">
                    {r.editor.name} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
