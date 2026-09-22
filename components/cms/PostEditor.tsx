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
} from "lucide-react";
import EditorToolbar from "./EditorToolbar";
import MediaPicker from "./MediaPicker";
import SeoPanel, { SeoFields } from "./SeoPanel";
import WritingPanel from "./WritingPanel";
import Select from "@/components/Select";
import { cmsFetch } from "@/lib/cms-fetch";

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
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED">("DRAFT");
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
      const p = data.post;
      setTitle(p.title);
      setSummary(p.summary);
      setCategoryId(p.categoryId || "");
      setTags((p.tags ?? []).map((t: TagOption) => t.name));
      setFeaturedImageUrl(p.featuredImageUrl || "");
      setFeaturedImageAlt(p.featuredImageAlt || "");
      setBrandedFeaturedImageUrl(p.brandedFeaturedImageUrl || "");
      setBrandedSocialImageUrl(p.brandedSocialImageUrl || "");
      setStatus(p.status);
      setScheduledAt(p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 16) : "");
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
    if (!title.trim()) {
      setError("Add a title before saving.");
      return;
    }
    if (!silent) setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(overrideStatus ? { status: overrideStatus } : {});
      if (overrideStatus) setStatus(overrideStatus);

      if (!currentId) {
        const res = await cmsFetch("/api/cms/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        setCurrentId(data.post.id);
        router.replace(`/cms/${type === "news" ? "news" : "articles"}/${data.post.id}/edit`);
      } else {
        const res = await cmsFetch(`/api/cms/posts/${currentId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
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

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline"
          className="focus-ring mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-display text-xl font-bold text-white outline-none placeholder:text-white/30"
        />
        <textarea
          value={summary}
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
            <button
              onClick={() => save("DRAFT")}
              disabled={saving}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Draft
            </button>
            <button
              onClick={() => save("PUBLISHED")}
              disabled={saving}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-signal py-2.5 text-sm font-semibold text-white shadow-glow transition disabled:opacity-60"
            >
              <Send size={15} /> Publish Now
            </button>

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
              onClick={() => save("SCHEDULED")}
              disabled={saving || !scheduledAt}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-cyanDeep/80 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40"
            >
              Schedule Publish
            </button>

            {status === "PUBLISHED" && (
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
          </div>
          <p className="mt-3 text-center text-xs text-white/30">
            Current status: <span className="font-medium text-white/60">{status}</span>
          </p>
        </div>

        <div className="glass rounded-glass p-5">
          <p className="mb-3 font-display text-sm font-bold text-white">Featured Image</p>
          {featuredImageUrl ? (
            <div className="relative mb-2 aspect-video overflow-hidden rounded-xl">
              <NextImage src={featuredImageUrl} alt={featuredImageAlt} fill className="object-cover" />
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
                      <NextImage src={brandedFeaturedImageUrl} alt="Branded hero preview" fill className="object-cover" />
                    </div>
                    <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-white/30">Hero (16:9)</p>
                  </div>
                  <div>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                      <NextImage src={brandedSocialImageUrl} alt="Branded social preview" fill className="object-cover" />
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
