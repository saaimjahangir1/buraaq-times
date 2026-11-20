"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ListChecks, LogOut, SpellCheck } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/cms/ThemeToggle";

// The desk's frame: the same frosted top pills and warm backdrop as the CMS.

const pill =
  "border border-white/70 bg-white/55 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]";
const tab = "focus-ring flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition";
const tabOn = "bg-ink text-white shadow-md dark:bg-white dark:text-ink";
const tabOff = "text-ink/65 hover:bg-white/70 hover:text-ink dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white";

export default function ProofreadShell({
  user,
  children,
}: {
  user: { name: string; isAdmin: boolean; canWrite?: boolean };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    // Signs out of the desk only; a CMS sign-in in the same browser stays.
    await fetch("/api/cms/auth/logout?area=desk", { method: "POST" });
    router.push("/proofread/login");
    router.refresh();
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative min-h-screen">
      <div className="cms-backdrop" aria-hidden="true" />
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2">
          <Link href="/proofread" className={`${pill} focus-ring flex h-11 min-w-0 items-center gap-2 rounded-full pl-4 pr-3`}>
            <BrandMark idle={false} className="aspect-[423/125] h-[26px] brightness-0 dark:brightness-100" />
            <span className="hidden items-center gap-1 rounded-full bg-signal px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-black sm:flex">
              <SpellCheck size={12} /> Desk
            </span>
          </Link>

          <nav aria-label="Desk" className={`${pill} ml-auto flex items-center gap-0.5 rounded-full p-1`}>
            <Link href="/proofread" aria-current={pathname === "/proofread" ? "page" : undefined} className={`${tab} ${pathname === "/proofread" ? tabOn : tabOff}`}>
              <ListChecks size={15} /> <span className="hidden sm:inline">Queue</span>
            </Link>
            {user.isAdmin || user.canWrite ? (
              <Link
                href="/cms"
                // New tab: the CMS has its own sign-in, and the desk stays open here.
                target="_blank"
                rel="noopener noreferrer"
                className={`${tab} ${tabOff}`}
              >
                <LayoutDashboard size={15} /> <span className="hidden sm:inline">CMS</span>
              </Link>
            ) : null}
          </nav>

          <ThemeToggle />
          <div className={`${pill} flex h-11 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-1.5`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal text-[11px] font-bold text-black">{initials}</span>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink/80 dark:text-white/80 md:block">{user.name}</span>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="focus-ring rounded-full p-2 text-ink/50 transition hover:bg-black/5 hover:text-ink dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
