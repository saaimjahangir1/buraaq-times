import { getSession, canAccessType, Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, CheckCircle2, Clock, Archive, Users, MessageSquare, TrendingUp } from "lucide-react";

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href?: string;
}) {
  const Comp = href ? Link : "div";
  return (
    <Comp
      href={href as string}
      className="glass rounded-glass p-5 transition hover:shadow-glow"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal">
        {icon}
      </span>
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
    </Comp>
  );
}

export default async function CmsOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/cms/login");
  const role = session.role as Role;

  const typeFilter =
    role === "NEWS_EDITOR" ? { type: "news" } : role === "ARTICLE_EDITOR" ? { type: "article" } : {};

  const [draft, published, scheduled, archived, recent, pendingUsers, pendingComments] =
    await Promise.all([
      prisma.post.count({ where: { ...typeFilter, status: "DRAFT" } }),
      prisma.post.count({ where: { ...typeFilter, status: "PUBLISHED" } }),
      prisma.post.count({ where: { ...typeFilter, status: "SCHEDULED" } }),
      prisma.post.count({ where: { ...typeFilter, status: "ARCHIVED" } }),
      prisma.post.findMany({
        where: typeFilter,
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { author: { select: { name: true } } },
      }),
      role === "ADMIN" ? prisma.user.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
      role === "ADMIN"
        ? prisma.comment.count({ where: { status: "PENDING" } })
        : prisma.comment.count({ where: { status: "PENDING", post: { authorId: session.sub } } }),
    ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">
        Welcome back, {session.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-white/50">Here&apos;s what&apos;s happening in the newsroom.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<FileText size={17} />} label="Drafts" value={draft} />
        <StatCard icon={<CheckCircle2 size={17} />} label="Published" value={published} />
        <StatCard icon={<Clock size={17} />} label="Scheduled" value={scheduled} />
        <StatCard icon={<Archive size={17} />} label="Archived" value={archived} />
        {role === "ADMIN" && (
          <StatCard
            icon={<Users size={17} />}
            label="Pending user approvals"
            value={pendingUsers}
            href="/cms/users"
          />
        )}
        <StatCard
          icon={<MessageSquare size={17} />}
          label="Comments to moderate"
          value={pendingComments}
          href="/cms/comments"
        />
      </div>

      <div className="mt-8 glass rounded-glass p-5">
        <p className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
          <TrendingUp size={17} className="text-signal" /> Recent activity
        </p>
        <div className="space-y-1">
          {recent.length === 0 && <p className="text-sm text-white/40">Nothing here yet.</p>}
          {recent.map((p: (typeof recent)[number]) => (
            <Link
              key={p.id}
              href={`/cms/${p.type === "news" ? "news" : "articles"}/${p.id}/edit`}
              className="focus-ring flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/5"
            >
              <span className="min-w-0 flex-1 truncate text-white/80">{p.title}</span>
              <span className="shrink-0 text-xs text-white/40">{p.author.name}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  p.status === "PUBLISHED"
                    ? "bg-signal/20 text-signal"
                    : p.status === "SCHEDULED"
                    ? "bg-cyan/20 text-cyan"
                    : p.status === "ARCHIVED"
                    ? "bg-white/10 text-white/50"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {p.status}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {(role === "ADMIN" || canAccessType(role, "news")) && (
        <Link
          href="/cms/news/new"
          className="focus-ring mt-6 mr-3 inline-block rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white"
        >
          + New News Post
        </Link>
      )}
      {(role === "ADMIN" || canAccessType(role, "article")) && (
        <Link
          href="/cms/articles/new"
          className="focus-ring mt-6 inline-block rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white"
        >
          + New Article
        </Link>
      )}
    </div>
  );
}
