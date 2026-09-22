import { getSession, Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Eye, MessageSquare, FolderTree, TrendingUp } from "lucide-react";

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="truncate text-white/70">{label}</span>
        <span className="text-white/40">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-signal to-cyanDeep"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function CmsAnalyticsPage() {
  const session = await getSession();
  const role = session!.role as Role;
  const typeFilter = role === "NEWS_EDITOR" ? { type: "news" } : role === "ARTICLE_EDITOR" ? { type: "article" } : {};
  const scopeFilter = role === "ADMIN" ? typeFilter : { ...typeFilter, authorId: session!.sub };

  const [topPosts, totalViews, totalComments, categories, statusCounts] = await Promise.all([
    prisma.post.findMany({
      where: scopeFilter,
      orderBy: { views: "desc" },
      take: 8,
      select: { id: true, title: true, views: true, status: true, category: { select: { name: true } } },
    }),
    prisma.post.aggregate({ where: scopeFilter, _sum: { views: true } }),
    prisma.comment.count({
      where: role === "ADMIN" ? {} : { post: { authorId: session!.sub } },
    }),
    prisma.category.findMany({
      select: { name: true, _count: { select: { posts: true } } },
      orderBy: { posts: { _count: "desc" } },
      take: 8,
    }),
    prisma.post.groupBy({ by: ["status"], where: scopeFilter, _count: true }),
  ]);

  const maxViews = Math.max(1, ...topPosts.map((p: { views: number }) => p.views));
  const maxCategoryPosts = Math.max(
    1,
    ...categories.map((c: { _count: { posts: number } }) => c._count.posts)
  );
  const statusMap = Object.fromEntries(
    statusCounts.map((s: { status: string; _count: number }) => [s.status, s._count])
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
      <p className="mt-1 text-sm text-white/50">
        {role === "ADMIN" ? "Site-wide performance." : "Performance for your own posts."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass rounded-glass p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal">
            <Eye size={17} />
          </span>
          <p className="mt-3 font-display text-2xl font-bold text-white">
            {(totalViews._sum.views ?? 0).toLocaleString()}
          </p>
          <p className="text-sm text-white/50">Total views</p>
        </div>
        <div className="glass rounded-glass p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal">
            <MessageSquare size={17} />
          </span>
          <p className="mt-3 font-display text-2xl font-bold text-white">{totalComments}</p>
          <p className="text-sm text-white/50">Comments</p>
        </div>
        <div className="glass rounded-glass p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal">
            <TrendingUp size={17} />
          </span>
          <p className="mt-3 font-display text-2xl font-bold text-white">{statusMap.PUBLISHED ?? 0}</p>
          <p className="text-sm text-white/50">Published</p>
        </div>
        <div className="glass rounded-glass p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal">
            <FolderTree size={17} />
          </span>
          <p className="mt-3 font-display text-2xl font-bold text-white">{categories.length}</p>
          <p className="text-sm text-white/50">Active categories</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass rounded-glass p-5">
          <p className="mb-4 font-display text-base font-bold text-white">Most read</p>
          <div className="space-y-3">
            {topPosts.length === 0 && <p className="text-sm text-white/40">No data yet.</p>}
            {topPosts.map((p: { id: string; title: string; views: number }) => (
              <Bar key={p.id} label={p.title} value={p.views} max={maxViews} />
            ))}
          </div>
        </div>

        <div className="glass rounded-glass p-5">
          <p className="mb-4 font-display text-base font-bold text-white">Posts by category</p>
          <div className="space-y-3">
            {categories.length === 0 && <p className="text-sm text-white/40">No data yet.</p>}
            {categories.map((c: { name: string; _count: { posts: number } }) => (
              <Bar key={c.name} label={c.name} value={c._count.posts} max={maxCategoryPosts} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-white/30">
        Views are counted from real page loads on the public site (via
        /api/track-view) — not a placeholder. Deeper metrics like bounce
        rate, read time, and traffic source aren&apos;t tracked yet.
      </p>
    </div>
  );
}
