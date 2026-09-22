import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SectionHeading({
  eyebrow,
  title,
  viewAllHref,
}: {
  eyebrow: string;
  title: string;
  viewAllHref?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
          {eyebrow}
        </span>
        <h2 className="font-display text-2xl font-bold text-ink dark:text-white">{title}</h2>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="focus-ring group flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-signal transition hover:bg-signal/10"
        >
          View All
          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
