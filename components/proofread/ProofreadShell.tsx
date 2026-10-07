"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, SpellCheck, LayoutDashboard } from "lucide-react";
import BrandMark from "@/components/BrandMark";

export default function ProofreadShell({
  user,
  children,
}: {
  user: { name: string; isAdmin: boolean };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    await fetch("/api/cms/auth/logout", { method: "POST" });
    router.push("/proofread/login");
    router.refresh();
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-void/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/proofread" className="flex min-w-0 items-center gap-2">
            <BrandMark width={104} height={31} />
            <span className="hidden items-center gap-1 rounded-full bg-signal/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-signal sm:flex">
              <SpellCheck size={12} /> Proofreading
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {pathname !== "/proofread" && (
              <Link
                href="/proofread"
                className="focus-ring hidden rounded-full px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white sm:block"
              >
                Queue
              </Link>
            )}
            {user.isAdmin && (
              <Link
                href="/cms"
                className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
              >
                <LayoutDashboard size={15} /> <span className="hidden sm:inline">CMS</span>
              </Link>
            )}
            <div className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep text-[11px] font-bold text-white">
                {initials}
              </span>
              <span className="hidden max-w-[10rem] truncate text-sm text-white/80 sm:block">{user.name}</span>
              <button
                onClick={logout}
                aria-label="Sign out"
                className="focus-ring rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
