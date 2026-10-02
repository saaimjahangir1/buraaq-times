"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, Copy, Check, Trash2 } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  altText: string | null;
  createdAt: string;
  uploadedBy: { name: string };
}

export default function CmsMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/cms/media");
    const data = await res.json();
    setItems(data.media ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("altText", file.name.replace(/\.[^.]+$/, ""));
      await cmsFetch("/api/cms/media", { method: "POST", body: form });
    }
    setUploading(false);
    load();
  };

  const copy = (item: MediaItem) => {
    navigator.clipboard?.writeText(window.location.origin + item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const remove = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.filename}"? This can't be undone.`)) return;
    setDeletingId(item.id);
    try {
      const res = await cmsFetch(`/api/cms/media/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      setItems((prev) => prev.filter((m) => m.id !== item.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Media Library</h1>
          <p className="mt-1 text-sm text-white/50">{items.length} files</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="focus-ring flex items-center gap-2 rounded-full bg-signal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          Bulk Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {loading && <p className="col-span-full text-sm text-white/40">Loading...</p>}
        {!loading && items.length === 0 && (
          <p className="col-span-full text-sm text-white/40">No media yet — upload some above.</p>
        )}
        {items.map((m) => (
          <div key={m.id} className="glass overflow-hidden rounded-glass">
            <div className="relative aspect-square">
              <Image src={m.url} alt={m.altText || ""} fill unoptimized className="object-cover" />
            </div>
            <div className="p-2.5">
              <p className="truncate text-xs text-white/70">{m.filename}</p>
              <p className="text-[10px] text-white/30">{(m.size / 1024).toFixed(0)} KB</p>
              <div className="mt-1.5 flex gap-1">
                <button
                  onClick={() => copy(m)}
                  className="focus-ring flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 py-1.5 text-[11px] text-white/60 hover:bg-white/10"
                >
                  {copiedId === m.id ? <Check size={11} /> : <Copy size={11} />}
                  {copiedId === m.id ? "Copied" : "Copy URL"}
                </button>
                <button
                  onClick={() => remove(m)}
                  disabled={deletingId === m.id}
                  aria-label={`Delete ${m.filename}`}
                  className="focus-ring flex items-center justify-center rounded-lg bg-red-500/10 px-2.5 py-1.5 text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deletingId === m.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
