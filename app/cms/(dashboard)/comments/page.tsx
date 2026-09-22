"use client";

import { useEffect, useState } from "react";
import { Check, X, Trash2, ShieldOff, ShieldAlert } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

interface CommentRow {
  id: string;
  authorName: string;
  authorEmail: string;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SPAM";
  createdAt: string;
  spamScore: number;
  spamReason: string | null;
  post: { title: string; type: string };
}

export default function CmsCommentsPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "SPAM" | "ALL">("PENDING");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/cms/comments");
    const data = await res.json();
    setComments(data.comments ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const moderate = async (id: string, status: CommentRow["status"]) => {
    await cmsFetch(`/api/cms/comments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const remove = async (id: string) => {
    await cmsFetch(`/api/cms/comments/${id}`, { method: "DELETE" });
    load();
  };

  const visible =
    filter === "ALL" ? comments : comments.filter((c) => c.status === filter);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Comments</h1>
      <p className="mt-1 text-sm text-white/50">Moderate reader comments across your posts.</p>

      <div className="mt-5 flex gap-1.5">
        {(["PENDING", "SPAM", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
              filter === f ? "bg-signal text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {loading && <p className="text-sm text-white/40">Loading...</p>}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-white/40">Nothing to moderate right now.</p>
        )}
        {visible.map((c) => (
          <div key={c.id} className="glass rounded-glass p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">
                  {c.authorName} <span className="font-normal text-white/40">on</span> {c.post.title}
                </p>
                <p className="text-xs text-white/30">{c.authorEmail}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  c.status === "APPROVED"
                    ? "bg-signal/20 text-signal"
                    : c.status === "SPAM" || c.status === "REJECTED"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {c.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/70">{c.body}</p>
            {c.spamScore > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-400">
                <ShieldAlert size={12} /> Spam score {c.spamScore}/100
                {c.spamReason ? ` — ${c.spamReason}` : ""}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => moderate(c.id, "APPROVED")}
                className="focus-ring flex items-center gap-1 rounded-full bg-signal/20 px-3 py-1.5 text-xs font-medium text-signal hover:bg-signal/30"
              >
                <Check size={13} /> Approve
              </button>
              <button
                onClick={() => moderate(c.id, "REJECTED")}
                className="focus-ring flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10"
              >
                <X size={13} /> Reject
              </button>
              <button
                onClick={() => moderate(c.id, "SPAM")}
                className="focus-ring flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10"
              >
                <ShieldOff size={13} /> Spam
              </button>
              <button
                onClick={() => remove(c.id)}
                className="focus-ring flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
