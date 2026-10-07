import Link from "next/link";
import type { ReactNode } from "react";

/** Simple centred card used by the confirm and unsubscribe pages. */
export default function NewsletterNotice({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-4 mb-16 mt-6 md:mx-8">
      <section className="glass-strong mx-auto max-w-xl rounded-glass p-8 text-center md:p-12">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
          {icon}
        </span>
        <h1 className="font-display text-2xl font-bold text-ink dark:text-white md:text-3xl">{title}</h1>
        <div className="mt-3 text-sm leading-relaxed text-ink/65 dark:text-white/65">{children}</div>
        <Link
          href="/"
          className="focus-ring mt-6 inline-block rounded-full bg-gradient-to-r from-signal to-cyanDeep px-6 py-3 text-sm font-semibold text-white shadow-glow"
        >
          Back to Buraaq Times
        </Link>
      </section>
    </div>
  );
}
