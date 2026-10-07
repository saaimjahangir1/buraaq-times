"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, Pencil, Clock, Eye } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

interface PostRow {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
  views: number;
  author: { name: string };
  category: { name: string } | null;
  reviews?: { status: string; claimedBy: { name: string } | null }[];
}

const STATUS_TABS = ["ALL", "DRAFT", "IN_REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const;

/** Small second badge showing where the latest proofreading round stands. */
function ReviewBadge({ review }: { review?: { status: string; claimedBy: { name: string } | null } }) {
  if (!review) return null;
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: "awaiting proofread", cls: "bg-amber-400/15 text-amber-300" },
    CLAIMED: { label: `proofreading${review.claimedBy ? ` · ${review.claimedBy.name.split(" ")[0]}` : ""}`, cls: "bg-cyan/15 text-cyan" },
    REJECTED: { label: "returned", cls: "bg-red-500/15 text-red-400" },
  };
  const m = map[review.status];
  if (!m) return null;
  return (
    <span className={`ml-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${m.cls}`}>
      {m.label}
    </span>
  );
}

export default function PostTable({ type }: { type: "news" | "article" }) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (status !== "ALL") params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`/api/cms/posts?${params.toString()}`);
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }, [type, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    await cmsFetch(`/api/cms/posts/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-white">
          {type === "news" ? "News" : "Articles"}
        </h1>
        <Link
          href={`/cms/${type === "news" ? "news" : "articles"}/new`}
          className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={15} /> New {type === "news" ? "News Post" : "Article"}
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
          <Search size={15} className="text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or summary..."
            className="bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                status === s ? "bg-signal text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {s.toLowerCase().replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-glass border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && posts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  No posts yet.
                </td>
              </tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="transition hover:bg-white/[0.03]">
                <td className="max-w-xs truncate px-4 py-3 text-white/90">{p.title}</td>
                <td className="px-4 py-3 text-white/50">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-white/50">{p.author.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      p.status === "PUBLISHED"
                        ? "bg-signal/20 text-signal"
                        : p.status === "SCHEDULED"
                        ? "bg-cyan/20 text-cyan"
                        : p.status === "ARCHIVED"
                        ? "bg-white/10 text-white/50"
                        : p.status === "IN_REVIEW"
                        ? "bg-amber-400/15 text-amber-300"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {p.status.replace("_", " ")}
                  </span>
                  <ReviewBadge review={p.reviews?.[0]} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-white/40">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/40">
                  <span className="flex items-center gap-1">
                    <Eye size={12} /> {p.views}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/cms/${type === "news" ? "news" : "articles"}/${p.id}/edit`}
                      className="focus-ring rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => remove(p.id)}
                      className="focus-ring rounded-lg p-1.5 text-white/50 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
