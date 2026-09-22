"use client";

import { useEffect, useState } from "react";
import { Plus, FolderTree } from "lucide-react";
import { cmsFetch } from "@/lib/cms-fetch";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { posts: number };
}

export default function CmsCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/cms/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  };

  useEffect(() => {
    load();
    fetch("/api/cms/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.user?.role === "ADMIN"));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await cmsFetch("/api/cms/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setName("");
    load();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Categories</h1>
      <p className="mt-1 text-sm text-white/50">
        Used across News and Articles for organization and navigation.
      </p>

      {isAdmin && (
        <form onSubmit={create} className="mt-5 flex max-w-sm gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
            className="focus-ring flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none"
          />
          <button
            type="submit"
            className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={15} /> Add
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="glass flex items-center gap-3 rounded-glass p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal">
              <FolderTree size={16} />
            </span>
            <div>
              <p className="font-medium text-white">{c.name}</p>
              <p className="text-xs text-white/40">{c._count.posts} posts</p>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-white/40">No categories yet.</p>}
      </div>
    </div>
  );
}
