"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { CMS_THEME_KEY } from "@/lib/cms-theme";

/** Sun / moon button in the top bar. Remembered in this browser. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(CMS_THEME_KEY, next ? "dark" : "light");
    } catch {
      /* storage blocked: the choice just isn't remembered */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/55 text-ink/75 shadow-sm backdrop-blur-xl transition hover:bg-white/80 hover:text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
