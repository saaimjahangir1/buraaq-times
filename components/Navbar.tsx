"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, User, Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import BrandMark from "./BrandMark";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "News", href: "/#news" },
  { label: "Articles", href: "/#articles" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div className="w-full max-w-6xl">
        <nav
          className={`glass-strong flex w-full items-center justify-between gap-2 rounded-glass px-2.5 py-1.5 transition-shadow duration-300 sm:px-5 sm:py-3 ${
            scrolled ? "shadow-glow" : ""
          }`}
        >
          <Link href="/" className="flex min-w-0 shrink-0 items-center">
            <BrandMark className="aspect-[423/125] h-9 sm:h-11 md:h-14" />
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="focus-ring rounded-full px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-signal/10 hover:text-signal dark:text-white/70"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <Link
              href="/search"
              aria-label="Search"
              className="focus-ring rounded-full p-1.5 text-ink/70 transition hover:bg-signal/10 hover:text-signal dark:text-white/70 sm:p-2"
            >
              <Search size={18} />
            </Link>
            <ThemeToggle />
            {/* Sign-in moves into the mobile panel below; stays inline from sm: up */}
            <Link
              href="/cms/login"
              aria-label="Sign in"
              className="focus-ring hidden items-center gap-2 rounded-full bg-signal/10 px-3 py-2 text-sm font-medium text-signal transition hover:bg-signal/20 sm:flex"
            >
              <User size={16} />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="focus-ring rounded-full p-1.5 text-ink/70 transition hover:bg-signal/10 hover:text-signal dark:text-white/70 sm:p-2 md:hidden"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="glass-strong mt-2 rounded-glass p-2 md:hidden">
            <ul className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="focus-ring block rounded-full px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-signal/10 hover:text-signal dark:text-white/80"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="my-1 border-t border-black/10 dark:border-white/10" />
              <li>
                <Link
                  href="/cms/login"
                  onClick={() => setMobileOpen(false)}
                  className="focus-ring flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-signal transition hover:bg-signal/10"
                >
                  <User size={16} />
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
