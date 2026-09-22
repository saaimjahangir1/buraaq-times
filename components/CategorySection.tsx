import { Post, postHref } from "@/lib/types";
import PostCard from "./PostCard";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";

export default function CategorySection({
  category,
  posts,
  type,
}: {
  category: string;
  posts: Post[];
  type: "news" | "article";
}) {
  if (posts.length === 0) return null;
  const [featured, ...rest] = posts;

  return (
    <section className="mx-4 mt-16 md:mx-8">
      <Reveal>
        <SectionHeading
          eyebrow="Category"
          title={category}
          viewAllHref={`/${type}?category=${category.toLowerCase()}`}
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-1">
          <Link
            href={postHref(featured)}
            className="glass focus-ring group flex h-full flex-col overflow-hidden rounded-glass"
          >
            <div className="relative h-44 overflow-hidden">
              <Image
                src={featured.image}
                alt=""
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="33vw"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="font-display text-lg font-bold leading-snug text-ink group-hover:text-signal dark:text-white">
                {featured.title}
              </h3>
              <p className="line-clamp-2 text-sm text-ink/60 dark:text-white/60">
                {featured.summary}
              </p>
              <span className="mt-auto flex items-center gap-1 font-mono text-[11px] text-ink/50 dark:text-white/40">
                <Clock size={11} /> {featured.readTime}
              </span>
            </div>
          </Link>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-2">
          {rest.slice(0, 4).map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.05} className="h-full">
              <PostCard post={p} size="sm" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
