"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/(site)/providers";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="focus-ring lg-track relative flex h-9 w-16 items-center rounded-full px-1 transition"
    >
      <motion.span
        className="lg-droplet flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-charcoal"
        animate={{ x: isDark ? 28 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {isDark ? <Moon size={14} className="text-cyan" /> : <Sun size={14} className="text-signal" />}
      </motion.span>
    </button>
  );
}
