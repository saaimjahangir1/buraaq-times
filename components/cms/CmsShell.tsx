"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Newspaper,
  SpellCheck,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { Role, roleLabel, AccessState } from "@/lib/auth-shared";
import RequestAccess from "@/components/account/RequestAccess";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import BrandMark from "@/components/BrandMark";

// The CMS frame: a row of frosted pills across the top (brand, page tabs,
// theme, notifications, account) over a warm blurred backdrop — no sidebar.

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  /** Shown under "More" on wide screens (still listed on phones). */
  more?: boolean;
}

const WRITERS: Role[] = ["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR"];

const NAV: NavItem[] = [
  { href: "/cms", label: "Dashboard", icon: <LayoutDashboard size={15} />, roles: WRITERS },
  { href: "/cms/news", label: "News", icon: <Newspaper size={15} />, roles: ["ADMIN", "NEWS_EDITOR"] },
  { href: "/cms/articles", label: "Articles", icon: <BookOpen size={15} />, roles: ["ADMIN", "ARTICLE_EDITOR"] },
  { href: "/cms/analytics", label: "Analytics", icon: <BarChart3 size={15} />, roles: WRITERS },
  { href: "/cms/media", label: "Media", icon: <ImageIcon size={15} />, roles: WRITERS },
  { href: "/cms/comments", label: "Comments", icon: <MessageSquare size={15} />, roles: ["ADMIN"] },
  { href: "/cms/users", label: "Users", icon: <Users size={15} />, roles: ["ADMIN"] },
  { href: "/cms/google-analytics", label: "Google Analytics", icon: <Activity size={15} />, roles: ["ADMIN"], more: true },
  { href: "/cms/categories", label: "Categories", icon: <FolderTree size={15} />, roles: ["ADMIN"], more: true },
  { href: "/cms/newsletter", label: "Newsletter", icon: <Mail size={15} />, roles: ["ADMIN"], more: true },
  { href: "/cms/resumes", label: "Resumes", icon: <FileText size={15} />, roles: ["ADMIN"], more: true },
];

// Shared pill look.
export const pill =
  "border border-white/70 bg-white/55 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]";
const tabBase = "focus-ring flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition";
const tabOn = "bg-ink text-white shadow-md dark:bg-white dark:text-ink";
const tabOff = "text-ink/65 hover:bg-white/70 hover:text-ink dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white";

/** Closes a popover on outside click / Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function CmsShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role; proofreader?: AccessState };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  const moreRef = useDismiss(moreOpen, () => setMoreOpen(false));
  const meRef = useDismiss(meOpen, () => setMeOpen(false));

  // Close menus when the page changes.
  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
    setMeOpen(false);
  }, [pathname]);

  const items = NAV.filter((i) => i.roles.includes(user.role));
  const main = items.filter((i) => !i.more);
  const more = items.filter((i) => i.more);
  const isActive = (href: string) => (href === "/cms" ? pathname === "/cms" : pathname.startsWith(href));
  const moreActive = more.some((i) => isActive(i.href));

  const logout = async () => {
    // Signs out of the CMS only; a proofreading-desk sign-in stays.
    await fetch("/api/cms/auth/logout?area=cms", { method: "POST" });
    router.push("/cms/login");
    router.refresh();
  };

  const menuItem =
    "focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-ink/75 transition hover:bg-black/5 hover:text-ink dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white";
  const panel =
    "absolute right-0 top-[3.25rem] z-50 rounded-2xl border border-white/70 bg-[#f6f1e8]/95 p-2 shadow-[0_24px_60px_-20px_rgba(60,45,20,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1d1914]/95 dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]";

  return (
    <div className="relative min-h-screen">
      <div className="cms-backdrop" aria-hidden="true" />

      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2">
          {/* Brand */}
          <Link href="/cms" className={`${pill} focus-ring flex h-11 shrink-0 items-center gap-2 rounded-full pl-4 pr-3`}>
            <BrandMark width={92} height={27} idle={false} className="aspect-[423/125] h-[26px] brightness-0 dark:brightness-100" />
            <span className="rounded-full bg-ink/[0.07] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/55 dark:bg-white/10 dark:text-white/55">
              CMS
            </span>
          </Link>

          {/* Page tabs (wide screens) */}
          <nav aria-label="CMS sections" className="ml-auto hidden min-w-0 lg:flex">
            <div className={`${pill} no-scrollbar flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full p-1`}>
              {main.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`${tabBase} ${isActive(item.href) ? tabOn : tabOff}`}>
                  {item.label}
                </Link>
              ))}
              {more.length ? (
                <div ref={moreRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((o) => !o)}
                    className={`${tabBase} ${moreActive ? tabOn : tabOff}`}
                  >
                    More <ChevronDown size={14} className={`transition ${moreOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              ) : null}
            </div>
            {/* "More" menu lives outside the scrolling pill row so it isn't clipped */}
            {moreOpen ? (
              <div className="relative">
                <div className={`${panel} w-56`} role="menu">
                  {more.map((item) => (
                    <Link key={item.href} href={item.href} role="menuitem" className={`${menuItem} ${isActive(item.href) ? "bg-black/5 font-semibold text-ink dark:bg-white/10 dark:text-white" : ""}`}>
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </nav>

          {/* Right-hand pills */}
          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <ThemeToggle />
            <div className={`${pill} flex h-11 w-11 items-center justify-center rounded-full`}>
              <NotificationBell />
            </div>
            <div ref={meRef} style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Your account"
                aria-expanded={meOpen}
                onClick={() => setMeOpen((o) => !o)}
                className={`${pill} focus-ring flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold text-ink dark:text-white`}
              >
                {initialsOf(user.name)}
              </button>
              {meOpen ? (
                <div className={`${panel} w-72`} role="menu">
                  <div className="flex items-center gap-3 px-3 pb-3 pt-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal text-sm font-bold text-black">{initialsOf(user.name)}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink dark:text-white">{user.name}</p>
                      <p className="truncate text-xs text-ink/55 dark:text-white/50">{roleLabel(user.role)}</p>
                    </div>
                  </div>
                  <div className="space-y-0.5 border-t border-black/5 pt-2 dark:border-white/10">
                    <Link href="/cms/profile" role="menuitem" className={menuItem}>
                      <UserCircle size={16} /> Profile & security
                    </Link>
                    {user.proofreader === "APPROVED" ? (
                      // New tab: the desk has its own sign-in, and the CMS stays open here.
                      <Link href="/proofread" target="_blank" rel="noopener noreferrer" role="menuitem" className={menuItem}>
                        <SpellCheck size={16} /> Proofreading desk
                      </Link>
                    ) : null}
                    {user.proofreader === "PENDING" ? (
                      <p className="flex items-center gap-2.5 px-3 py-2 text-xs text-ink/50 dark:text-white/45">
                        <SpellCheck size={14} /> Proofreader access requested
                      </p>
                    ) : null}
                    {user.proofreader === null && user.role !== "ADMIN" ? (
                      <details className="rounded-xl px-3 py-1 text-sm text-ink/70 dark:text-white/60">
                        <summary className="flex cursor-pointer list-none items-center gap-2.5 py-1.5 hover:text-ink dark:hover:text-white">
                          <SpellCheck size={16} /> Proofread too?
                        </summary>
                        <div className="pb-2 pt-1 text-left">
                          <p className="mb-2 text-xs text-ink/55 dark:text-white/45">
                            Help check other writers&apos; stories before they go live. Same account, an admin approves it.
                          </p>
                          <RequestAccess kinds={["PROOFREADER"]} />
                        </div>
                      </details>
                    ) : null}
                    <Link href="/" target="_blank" role="menuitem" className={menuItem}>
                      <ExternalLink size={16} /> View site
                    </Link>
                    <button type="button" role="menuitem" onClick={logout} className={`${menuItem} text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`}>
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
              className={`${pill} focus-ring flex h-11 w-11 items-center justify-center rounded-full text-ink dark:text-white lg:hidden`}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Phone / tablet: all sections as pills */}
        {mobileOpen ? (
          <nav aria-label="CMS sections" className="mx-auto mt-2 max-w-[1500px] lg:hidden">
            <div className={`${pill} grid grid-cols-2 gap-1 rounded-3xl p-2 sm:grid-cols-3`}>
              {items.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`${tabBase} justify-start ${isActive(item.href) ? tabOn : tabOff}`}>
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-[1500px] px-3 pb-12 pt-5 sm:px-5 md:px-6 md:pt-7">{children}</main>
    </div>
  );
}
