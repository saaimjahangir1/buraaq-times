"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, Upload, Loader2 } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  altText: string | null;
}

export default function MediaPicker({
  onSelect,
  onClose,
  crop = false,
}: {
  onSelect: (url: string, alt: string) => void;
  onClose: () => void;
  crop?: boolean;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

  const upload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("altText", file.name.replace(/\.[^.]+$/, ""));
    if (crop) form.append("crop", "true");
    const res = await cmsFetch("/api/cms/media", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      await load();
      onSelect(data.media.url, data.media.altText || "");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="glass-strong flex max-h-[80vh] w-full max-w-2xl flex-col rounded-glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg font-bold text-white">Media Library</p>
          <button onClick={onClose} className="focus-ring rounded-full p-1.5 text-white/50 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-4 text-sm font-medium text-white/60 transition hover:border-signal hover:text-white"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading..." : "Upload new image"}
          </button>
          {crop && (
            <p className="mt-2 text-center text-xs text-white/30">
              New uploads are auto-cropped to 16:9, framed around the most interesting part of the photo.
            </p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />

        <div className="grid flex-1 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
          {loading && <p className="col-span-full text-center text-sm text-white/40">Loading...</p>}
          {!loading && items.length === 0 && (
            <p className="col-span-full text-center text-sm text-white/40">No media yet — upload one above.</p>
          )}
          {items.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.url, m.altText || "")}
              className="focus-ring group relative aspect-square overflow-hidden rounded-xl border border-white/10"
            >
              <Image src={m.url} alt={m.altText || ""} fill className="object-cover transition group-hover:scale-105" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
