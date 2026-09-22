"use client";
import Select from "@/components/Select";

import { useMemo, useState } from "react";
import { Search as SearchIcon, X, SlidersHorizontal } from "lucide-react";
import PostCard from "@/components/PostCard";
import Reveal from "@/components/Reveal";
import { CATEGORIES, ContentType, Post } from "@/lib/types";

type DateFilter = "any" | "week" | "month";

function withinDate(dateStr: string, filter: DateFilter) {
  if (filter === "any") return true;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return true;
  const days = filter === "week" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

export default function SearchClient({ posts: allPosts }: { posts: Post[] }) {
  const AUTHORS = useMemo(() => [...new Set(allPosts.map((p) => p.author))].sort(), [allPosts]);
  const TAGS = useMemo(() => [...new Set(allPosts.flatMap((p) => p.tags))].sort(), [allPosts]);

  const [query, setQuery] = useState("");
  const [type, setType] = useState<ContentType | "all">("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [author, setAuthor] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggle = (list: string[], setList: (l: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const results: Post[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPosts.filter((p) => {
      if (type !== "all" && p.type !== type) return false;
      if (categories.length && !categories.includes(p.category)) return false;
      if (author && p.author !== author) return false;
      if (tags.length && !tags.some((t) => p.tags.includes(t))) return false;
      if (!withinDate(p.date, dateFilter)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allPosts, query, type, categories, author, tags, dateFilter]);

  // Lightweight "instant suggestions" — top few title matches shown as the
  // person types, before they've committed to scanning the full grid.
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return results.slice(0, 5);
  }, [query, results]);

  const activeFilterCount =
    categories.length + tags.length + (author ? 1 : 0) + (dateFilter !== "any" ? 1 : 0) + (type !== "all" ? 1 : 0);

  const clearFilters = () => {
    setType("all");
    setCategories([]);
    setAuthor("");
    setTags([]);
    setDateFilter("any");
  };

  return (
    <div className="mx-4 mb-16 mt-6 md:mx-8">
      <Reveal>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Search</span>
        <h1 className="font-display text-3xl font-bold text-ink dark:text-white">
          Find any story or article
        </h1>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="relative mt-6">
          <div className="glass-strong flex items-center gap-3 rounded-full px-5 py-3.5">
            <SearchIcon size={18} className="shrink-0 text-ink/40 dark:text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, authors, categories, tags..."
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40 dark:text-white dark:placeholder:text-white/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="focus-ring rounded-full p-1 text-ink/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`focus-ring flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filtersOpen || activeFilterCount
                  ? "bg-signal text-white"
                  : "bg-black/[0.05] text-ink/60 dark:bg-white/10 dark:text-white/60"
              }`}
            >
              <SlidersHorizontal size={13} />
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          </div>

          {/* Instant suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="glass-strong absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-glass p-2">
              {suggestions.map((s) => (
                <a
                  key={s.slug}
                  href={`/${s.type === "news" ? "news" : "articles"}/${s.slug}`}
                  className="focus-ring flex items-center gap-3 rounded-xl p-2.5 text-sm transition hover:bg-signal/10"
                >
                  <span className="rounded-full bg-signal/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-signal">
                    {s.category}
                  </span>
                  <span className="line-clamp-1 text-ink/80 dark:text-white/80">{s.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {filtersOpen && (
        <Reveal delay={0.05}>
          <div className="glass mt-4 space-y-4 rounded-glass p-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50 dark:text-white/40">
                Content Type
              </p>
              <div className="flex gap-2">
                {(["all", "news", "article"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                      type === t ? "bg-signal text-white" : "bg-black/[0.05] text-ink/60 dark:bg-white/10 dark:text-white/60"
                    }`}
                  >
                    {t === "article" ? "Articles" : t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50 dark:text-white/40">
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggle(categories, setCategories, c)}
                    className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      categories.includes(c)
                        ? "bg-signal text-white"
                        : "bg-black/[0.05] text-ink/60 dark:bg-white/10 dark:text-white/60"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50 dark:text-white/40">
                  Author
                </p>
                <Select
                  value={author}
                  onChange={setAuthor}
                  placeholder="Any author"
                  options={[
                    { value: "", label: "Any author" },
                    ...AUTHORS.map((a) => ({ value: a, label: a })),
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50 dark:text-white/40">
                  Date
                </p>
                <Select
                  value={dateFilter}
                  onChange={(v) => setDateFilter(v as DateFilter)}
                  options={[
                    { value: "any", label: "Any time" },
                    { value: "week", label: "Past week" },
                    { value: "month", label: "Past month" },
                  ]}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50 dark:text-white/40">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggle(tags, setTags, t)}
                    className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      tags.includes(t)
                        ? "bg-signal text-white"
                        : "bg-black/[0.05] text-ink/60 dark:bg-white/10 dark:text-white/60"
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="focus-ring text-xs font-medium text-signal hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </Reveal>
      )}

      <p className="mt-8 mb-4 text-sm text-ink/50 dark:text-white/40">
        {results.length} result{results.length !== 1 && "s"}
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((p, i) => (
          <Reveal key={p.slug} delay={Math.min(i * 0.04, 0.4)} className="h-full">
            <PostCard post={p} />
          </Reveal>
        ))}
        {results.length === 0 && (
          <p className="col-span-full py-16 text-center text-ink/50 dark:text-white/50">
            No matches — try different keywords or fewer filters.
          </p>
        )}
      </div>
    </div>
  );
}
