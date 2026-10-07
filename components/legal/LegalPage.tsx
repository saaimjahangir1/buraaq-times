import type { ReactNode } from "react";

/** Shared layout for the Privacy Policy and Terms pages. */
export default function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-4 mb-16 mt-6 md:mx-8">
      <section className="glass-strong mx-auto max-w-4xl rounded-glass p-8 md:p-12">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{eyebrow}</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink dark:text-white md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink/50 dark:text-white/50">Last updated: {updated}</p>
        <div className="mt-5 text-base leading-relaxed text-ink/75 dark:text-white/75">{intro}</div>
      </section>

      <article className="glass mx-auto mt-6 max-w-4xl rounded-glass p-8 md:p-12">
        <div className="prose max-w-none dark:prose-invert prose-headings:font-display prose-h2:mt-10 prose-h2:text-xl first:prose-h2:mt-0 prose-a:text-signal prose-li:my-1">
          {children}
        </div>
      </article>
    </div>
  );
}
