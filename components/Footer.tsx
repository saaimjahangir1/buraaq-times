"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Newspaper,
  FileText,
  LayoutGrid,
  ArrowRight,
  ArrowUp,
  type LucideIcon,
} from "lucide-react";
import FeatherMark from "@/components/FeatherMark";

const ACCENT = "rgb(var(--accent))";
const ACCENT_2 = "rgb(var(--accent-2))";
const ACCENT_SOFT = "rgb(var(--accent) / 0.12)";
const ACCENT_GLOW = "rgb(var(--accent) / 0.4)";

const SOCIALS = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: null, label: "X", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
];

const CARDS = [
  { icon: Newspaper, title: "News", description: "Breaking stories, updates and what's happening around the world.", href: "/news", cta: "View All" },
  { icon: FileText, title: "Articles", description: "In-depth analysis, opinions and stories worth exploring.", href: "/articles", cta: "View All" },
  { icon: LayoutGrid, title: "Categories", description: "Explore topics that interest you and stay informed.", href: "/search", cta: "Explore" },
];

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

interface SocialButtonProps {
  icon: LucideIcon | null;
  label: string;
  href: string;
  size?: "md" | "sm";
}

function SocialButton(props: SocialButtonProps) {
  const Icon = props.icon;
  const size = props.size || "md";
  const dims = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const iconSize = size === "md" ? 16 : 14;
  const className = "focus-ring group relative flex " + dims + " items-center justify-center rounded-full border border-black/15 text-ink/60 transition-all duration-300 hover:-translate-y-0.5 hover:text-ink dark:border-white/15 dark:text-white/70 dark:hover:text-white";

  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = "0 0 18px 0 " + ACCENT_GLOW;
    e.currentTarget.style.borderColor = ACCENT;
  };
  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.borderColor = "";
  };

  return (
    <a href={props.href} aria-label={props.label} className={className} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {Icon ? <Icon size={iconSize} strokeWidth={2} /> : <span className={size === "md" ? "text-sm font-bold" : "text-xs font-bold"}>X</span>}
    </a>
  );
}

function TrendingCard({ card }: { card: (typeof CARDS)[number] }) {
  const CardIcon = card.icon;
  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = "0 0 0 1px rgb(var(--accent) / 0.45), 0 8px 30px -8px rgb(var(--accent) / 0.3)";
  };
  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      <Link href={card.href} className="group relative block h-full overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02] p-5 transition-shadow duration-300 dark:border-white/10 dark:bg-white/[0.02]" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/[0.04] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full dark:via-white/[0.06]" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: ACCENT_SOFT, color: ACCENT }}>
          <CardIcon size={18} strokeWidth={1.8} />
        </span>
        <p className="relative mt-3.5 font-display text-base font-bold text-ink dark:text-white">{card.title}</p>
        <p className="relative mt-1.5 text-xs leading-relaxed text-ink/55 dark:text-white/45">{card.description}</p>
        <span className="relative mt-3.5 flex items-center gap-1 text-xs font-semibold" style={{ color: ACCENT }}>
          {card.cta}
          <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.div>
  );
}

export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const onBtnEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.boxShadow = "0 0 20px 0 " + ACCENT_GLOW;
  };
  const onBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <footer className="relative overflow-hidden border-t border-black/5 bg-paper dark:border-white/5">
      <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-black/[0.04] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block" style={{ background: "linear-gradient(160deg, #0a0e1a 0%, #060810 55%, #030405 100%)" }} />
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full blur-[100px]" style={{ background: "rgb(var(--accent) / 0.10)" }} />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-[110px]" style={{ background: "rgb(var(--accent-2) / 0.08)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.035]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.04]">
        <div className="absolute left-1/4 top-0 h-full w-px bg-ink dark:bg-white" />
        <div className="absolute left-3/4 top-0 h-full w-px bg-ink dark:bg-white" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-14 md:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr_200px]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <FeatherMark size={34} style={{ color: ACCENT }} />
              <span className="text-2xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                <span className="text-ink dark:text-white">Buraaq</span> <span style={{ color: ACCENT }}>Times</span>
              </span>
            </Link>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/40 dark:text-white/40">News • Articles • Perspectives</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/60 dark:text-white/50">More than just news — we bring you stories, ideas and perspectives that matter.</p>
            <div className="mt-5 flex items-center gap-2.5">
              {SOCIALS.map((s) => (
                <SocialButton key={s.label} icon={s.icon} label={s.label} href={s.href} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CARDS.map((card) => (
              <TrendingCard key={card.title} card={card} />
            ))}
          </div>

          <div className="border-black/10 dark:border-white/10 lg:border-l lg:pl-8">
            <p className="font-display text-sm font-bold text-ink dark:text-white">Quick Links</p>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="group focus-ring relative inline-flex items-center gap-1.5 text-sm text-ink/60 transition-all duration-300 hover:translate-x-1 hover:text-ink dark:text-white/55 dark:hover:text-white">
                    {l.label}
                    <ArrowRight size={12} className="translate-x-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                    <span className="absolute -bottom-0.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: "linear-gradient(90deg, " + ACCENT + ", " + ACCENT_2 + ")" }} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-black/10 pt-6 dark:border-white/10">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-xs text-ink/50 dark:text-white/40">© {new Date().getFullYear()} Buraaq Times. All rights reserved.</p>
            <div className="flex items-center gap-2">
              {SOCIALS.map((s) => (
                <SocialButton key={"sm-" + s.label} icon={s.icon} label={s.label} href={s.href} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={scrollToTop} aria-label="Back to top" className="focus-ring fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border bg-white/80 text-ink backdrop-blur-md transition-all duration-300 hover:scale-110 dark:bg-black/40 dark:text-white" style={{ borderColor: ACCENT_GLOW }} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave}>
        <ArrowUp size={16} />
      </button>
    </footer>
  );
}
