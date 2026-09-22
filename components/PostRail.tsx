import { Post } from "@/lib/types";
import PostCard from "./PostCard";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function PostRail({
  eyebrow,
  title,
  posts,
  rankBadge = false,
}: {
  eyebrow: string;
  title: string;
  posts: Post[];
  rankBadge?: boolean;
}) {
  if (posts.length === 0) return null;

  return (
    <section className="mx-4 mt-16 md:mx-8">
      <Reveal>
        <SectionHeading eyebrow={eyebrow} title={title} />
      </Reveal>
      <div className="scrollbar-thin flex gap-5 overflow-x-auto pb-3">
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.04} className="relative w-[260px] shrink-0">
            {rankBadge && (
              <span className="absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep font-display text-sm font-extrabold text-white shadow-glow">
                {i + 1}
              </span>
            )}
            <PostCard post={p} size="sm" />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
