import { redirect } from "next/navigation";
import { canAccessType } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import DashboardView, { type DashboardData } from "@/components/cms/DashboardView";

// Days are counted in Pakistan time (UTC+5, no daylight saving).
const PK_OFFSET_MS = 5 * 3600_000;
const DAY_MS = 86_400_000;

/** Monday 00:00 (Pakistan time) of the week containing `now`, as a real Date. */
function weekStart(now: Date) {
  const pk = new Date(now.getTime() + PK_OFFSET_MS);
  const sinceMonday = (pk.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate() - sinceMonday) - PK_OFFSET_MS);
}
const pkDayIndex = (d: Date, start: Date) => Math.floor((d.getTime() - start.getTime()) / DAY_MS);
const pkTime = (d: Date) => new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" }).format(d);

export default async function CmsOverviewPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/cms/login");
  const role = me.role;
  const isAdmin = role === "ADMIN";

  // Editors see their own section (news or articles); admins see everything.
  const typeFilter = role === "NEWS_EDITOR" ? { type: "news" } : role === "ARTICLE_EDITOR" ? { type: "article" } : {};
  // Proofreading numbers: admins see the whole desk, writers their own submissions.
  const mine = isAdmin ? {} : { submittedById: me.id };
  const editHref = (p: { id: string; type: string }) => `/cms/${p.type === "news" ? "news" : "articles"}/${p.id}/edit`;
  const sectionHref = role === "ARTICLE_EDITOR" ? "/cms/articles" : "/cms/news";

  const now = new Date();
  const start = weekStart(now);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  const lastStart = new Date(start.getTime() - 7 * DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);

  const [
    published,
    inReview,
    drafts,
    scheduled,
    views,
    comments,
    weekPosts,
    lastWeekCount,
    top,
    queue,
    claimed,
    oldest,
    approved,
    returned,
    pendingUsers,
    pendingComments,
    myDrafts,
    myReturned,
    categories,
    recent,
  ] = await Promise.all([
    prisma.post.count({ where: { ...typeFilter, status: "PUBLISHED" } }),
    prisma.post.count({ where: { ...typeFilter, status: "IN_REVIEW" } }),
    prisma.post.count({ where: { ...typeFilter, status: "DRAFT" } }),
    prisma.post.count({ where: { ...typeFilter, status: "SCHEDULED" } }),
    prisma.post.aggregate({ where: { ...typeFilter }, _sum: { views: true } }),
    prisma.comment.count({ where: { status: "APPROVED", post: { ...typeFilter } } }),
    // Published or scheduled within this week (Mon–Sun).
    prisma.post.findMany({
      where: {
        ...typeFilter,
        OR: [
          { status: "PUBLISHED", publishedAt: { gte: start, lt: end } },
          { status: "SCHEDULED", scheduledAt: { gte: start, lt: end } },
        ],
      },
      select: { id: true, type: true, title: true, status: true, publishedAt: true, scheduledAt: true },
      take: 200,
    }),
    prisma.post.count({ where: { ...typeFilter, status: "PUBLISHED", publishedAt: { gte: lastStart, lt: start } } }),
    prisma.post.findMany({
      where: { ...typeFilter, status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: 7,
      select: { id: true, type: true, title: true, views: true },
    }),
    prisma.postReview.count({ where: { ...mine, status: { in: ["PENDING", "CLAIMED"] }, post: { ...typeFilter } } }),
    prisma.postReview.count({ where: { ...mine, status: "CLAIMED", post: { ...typeFilter } } }),
    prisma.postReview.findFirst({
      where: { ...mine, status: "PENDING", post: { ...typeFilter } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.postReview.count({ where: { ...mine, status: "APPROVED", decidedAt: { gte: monthAgo }, post: { ...typeFilter } } }),
    prisma.postReview.count({ where: { ...mine, status: "REJECTED", decidedAt: { gte: monthAgo }, post: { ...typeFilter } } }),
    isAdmin
      ? prisma.user.count({
          where: {
            OR: [
              { status: "PENDING", role: { not: "PROOFREADER" } },
              { proofreaderStatus: "PENDING" },
              { role: "PROOFREADER", status: "PENDING", proofreaderStatus: null },
            ],
          },
        })
      : Promise.resolve(0),
    isAdmin ? prisma.comment.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    prisma.post.count({ where: { ...typeFilter, authorId: me.id, status: "DRAFT" } }),
    prisma.postReview.count({
      where: { submittedById: me.id, status: "REJECTED", decidedAt: { gte: twoWeeksAgo }, post: { ...typeFilter, status: "DRAFT" } },
    }),
    prisma.category.findMany({
      select: { name: true, _count: { select: { posts: { where: { ...typeFilter, status: "PUBLISHED" } } } } },
    }),
    prisma.post.findMany({
      where: typeFilter,
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { author: { select: { name: true } } },
    }),
  ]);

  // Week: bars and calendar.
  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayIdx = pkDayIndex(now, start);
  const days: DashboardData["calendar"]["days"] = DOW.map((dow, i) => {
    const date = new Date(start.getTime() + i * DAY_MS + PK_OFFSET_MS);
    return { key: dow, dow, date: date.getUTCDate(), today: i === todayIdx, items: [] };
  });
  const perDay = Array(7).fill(0) as number[];
  const dated = weekPosts
    .map((p) => ({ p, when: p.status === "PUBLISHED" ? p.publishedAt : p.scheduledAt }))
    .filter((x): x is { p: (typeof weekPosts)[number]; when: Date } => Boolean(x.when))
    .sort((a, b) => a.when.getTime() - b.when.getTime());
  for (const { p, when } of dated) {
    const i = pkDayIndex(when, start);
    if (i < 0 || i > 6) continue;
    if (p.status === "PUBLISHED") perDay[i]++;
    days[i].items.push({ title: p.title, time: pkTime(when), live: p.status === "PUBLISHED", href: editHref(p) });
  }

  const firstDay = new Date(start.getTime() + PK_OFFSET_MS);
  const lastDay = new Date(start.getTime() + 6 * DAY_MS + PK_OFFSET_MS);
  const month = (d: Date) => d.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  const monthLabel =
    month(firstDay) === month(lastDay) ? `${month(firstDay)} ${firstDay.getUTCFullYear()}` : `${month(firstDay).slice(0, 3)} – ${month(lastDay).slice(0, 3)} ${lastDay.getUTCFullYear()}`;

  const todos: DashboardData["todos"] = [];
  if (isAdmin) {
    todos.push({ key: "people", label: "Approve new people", detail: pendingUsers ? `${pendingUsers} waiting for access` : "No one waiting", href: "/cms/users", count: pendingUsers });
    todos.push({ key: "comments", label: "Moderate comments", detail: pendingComments ? `${pendingComments} to review` : "All caught up", href: "/cms/comments", count: pendingComments });
  }
  todos.push({ key: "returned", label: "Fix returned stories", detail: myReturned ? `${myReturned} came back with notes` : "Nothing returned", href: sectionHref, count: myReturned });
  todos.push({ key: "drafts", label: "Finish your drafts", detail: myDrafts ? `${myDrafts} draft${myDrafts === 1 ? "" : "s"} in progress` : "No drafts open", href: sectionHref, count: myDrafts });
  todos.push({ key: "review", label: isAdmin ? "Clear the proofreading queue" : "Stories with proofreaders", detail: queue ? `${queue} in the queue` : "Queue is empty", href: isAdmin ? "/proofread" : sectionHref, count: queue });

  const data: DashboardData = {
    firstName: me.name.split(" ")[0] || me.name,
    isAdmin,
    canNews: isAdmin || canAccessType(role, "news"),
    canArticle: isAdmin || canAccessType(role, "article"),
    status: { published, inReview, drafts, scheduled },
    totals: { published, views: views._sum.views ?? 0, comments },
    week: perDay.map((count, i) => ({ label: DOW[i].slice(0, 1), count, today: i === todayIdx })),
    weekTotal: perDay.reduce((a, b) => a + b, 0),
    lastWeekTotal: lastWeekCount,
    topStories: top.map((p) => ({ title: p.title, views: p.views, href: editHref(p) })),
    queue: { count: queue, claimed, oldestMinutes: oldest ? Math.max(0, Math.round((now.getTime() - oldest.createdAt.getTime()) / 60_000)) : null },
    passRate: { approved, returned, waiting: queue },
    todos,
    calendar: { monthLabel, days },
    categories: categories
      .map((c) => ({ name: c.name, count: c._count.posts }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    recent: recent.map((p) => ({ id: p.id, title: p.title, author: p.author.name, status: p.status, href: editHref(p) })),
  };

  return <DashboardView d={data} />;
}
