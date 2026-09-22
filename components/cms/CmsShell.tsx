"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  BookOpen,
  FolderTree,
  Image as ImageIcon,
  Users,
  MessageSquare,
  UserCircle,
  LogOut,
  Menu,
  X,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { Role, roleLabel } from "@/lib/auth-shared";
import NotificationBell from "./NotificationBell";
import BrandMark from "@/components/BrandMark";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/cms", label: "Overview", icon: <LayoutDashboard size={17} />, roles: ["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR"] },
  { href: "/cms/news", label: "News", icon: <Newspaper size={17} />, roles: ["ADMIN", "NEWS_EDITOR"] },
  { href: "/cms/articles", label: "Articles", icon: <BookOpen size={17} />, roles: ["ADMIN", "ARTICLE_EDITOR"] },
  { href: "/cms/analytics", label: "Analytics", icon: <BarChart3 size={17} />, roles: ["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR"] },
  { href: "/cms/categories", label: "Categories", icon: <FolderTree size={17} />, roles: ["ADMIN"] },
  { href: "/cms/media", label: "Media", icon: <ImageIcon size={17} />, roles: ["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR"] },
  { href: "/cms/comments", label: "Comments", icon: <MessageSquare size={17} />, roles: ["ADMIN"] },
  { href: "/cms/users", label: "Users", icon: <Users size={17} />, roles: ["ADMIN"] },
  { href: "/cms/profile", label: "Profile", icon: <UserCircle size={17} />, roles: ["ADMIN", "NEWS_EDITOR", "ARTICLE_EDITOR"] },
];

export default function CmsShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((i) => i.roles.includes(user.role));

  const logout = async () => {
    await fetch("/api/cms/auth/logout", { method: "POST" });
    router.push("/cms/login");
    router.refresh();
  };

  const isActive = (href: string) => (href === "/cms" ? pathname === "/cms" : pathname.startsWith(href));

  const SidebarContent = (
    <>
      <div className="mb-8 flex items-center justify-between">
        <Link href="/cms" className="flex items-center gap-2">
          <BrandMark width={110} height={34} />
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] font-normal uppercase text-white/50">
            CMS
          </span>
        </Link>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`focus-ring flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive(item.href)
                ? "bg-signal/20 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
        <Link
          href="/"
          target="_blank"
          className="focus-ring flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <ExternalLink size={16} /> View site
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep text-xs font-bold text-white">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-white/40">{roleLabel(user.role)}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="focus-ring rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-white/[0.02] p-5 md:flex">
        {SidebarContent}
      </aside>

      {/* Mobile topbar + drawer */}
      <div className="flex flex-1 flex-col md:hidden">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <span className="font-display font-bold text-white">Buraaq Times CMS</span>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={() => setMobileOpen(true)} className="focus-ring rounded-lg p-2 text-white">
              <Menu size={20} />
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex w-72 flex-col bg-charcoal p-5">
              <button
                onClick={() => setMobileOpen(false)}
                className="focus-ring mb-4 self-end rounded-lg p-2 text-white/60"
              >
                <X size={18} />
              </button>
              {SidebarContent}
            </div>
            <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
          </div>
        )}
      </div>

      <main className="flex-1 overflow-x-hidden p-5 md:p-8">{children}</main>
    </div>
  );
}
