"use client";

import { useEffect, useState } from "react";
import { Check, X, ShieldAlert } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";
import Select from "@/components/Select";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "NEWS_EDITOR" | "ARTICLE_EDITOR" | "PROOFREADER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  bio: string | null;
  createdAt: string;
  _count: { posts: number };
}

export default function CmsUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING">("PENDING");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/cms/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id: string, patch: Partial<Pick<UserRow, "status" | "role">>) => {
    await cmsFetch(`/api/cms/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  };

  const visible = filter === "PENDING" ? users.filter((u) => u.status === "PENDING") : users;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Users</h1>
      <p className="mt-1 text-sm text-white/50">Approve editor and proofreader accounts and manage roles.</p>

      <div className="mt-5 flex gap-1.5">
        {(["PENDING", "ALL"] as const).map((f) => (
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
          <p className="text-sm text-white/40">Nothing to show here.</p>
        )}
        {visible.map((u) => (
          <div key={u.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-glass p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep text-xs font-bold text-white">
                {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{u.name}</p>
                <p className="truncate text-xs text-white/40">{u.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
  		className="w-40"
  		value={u.role}
  		onChange={(v) => update(u.id, { role: v as UserRow["role"] })}
  		options={[
    		  { value: "ADMIN", label: "Admin" },
    		  { value: "NEWS_EDITOR", label: "News Editor" },
    		  { value: "ARTICLE_EDITOR", label: "Article Editor" },
    		  { value: "PROOFREADER", label: "Proofreader" },
  		]}
	      />

              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                  u.status === "APPROVED"
                    ? "bg-signal/20 text-signal"
                    : u.status === "REJECTED"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {u.status}
              </span>
              {u.role === "PROOFREADER" ? (
                <span className="text-xs text-white/30">proofreader</span>
              ) : (
                <span className="text-xs text-white/30">{u._count.posts} posts</span>
              )}

              {u.status !== "APPROVED" && (
                <button
                  onClick={() => update(u.id, { status: "APPROVED" })}
                  className="focus-ring flex items-center gap-1 rounded-full bg-signal/20 px-3 py-1.5 text-xs font-medium text-signal hover:bg-signal/30"
                >
                  <Check size={13} /> Approve
                </button>
              )}
              {u.status !== "REJECTED" && (
                <button
                  onClick={() => update(u.id, { status: "REJECTED" })}
                  className="focus-ring flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                >
                  <X size={13} /> Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-white/30">
        <ShieldAlert size={13} /> Role changes and rejections take effect the next time that user
        loads a page.
      </p>
    </div>
  );
}
