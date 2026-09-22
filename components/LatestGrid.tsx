import { Post } from "@/lib/types";
import PostCard from "./PostCard";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function LatestGrid({
  posts,
  type,
}: {
  posts: Post[];
  type: "news" | "article";
}) {
  return (
    <section id={type === "news" ? "news" : "articles"} className="mx-4 mt-16 md:mx-8">
      <Reveal>
        <SectionHeading
          eyebrow={`Latest ${type === "news" ? "News" : "Articles"}`}
          title={type === "news" ? "What's happening now" : "Fresh from our writers"}
          viewAllHref={`/${type}`}
        />
      </Reveal>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {posts.slice(0, 8).map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.05} className="h-full">
            <PostCard post={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
