export type ContentType = "news" | "article";

export interface Post {
  slug: string;
  type: ContentType;
  category: string;
  title: string;
  summary: string;
  author: string;
  authorRole: string;
  date: string;
  updated?: string;
  readTime: string;
  image: string;
  heroImage: string;
  featured?: boolean;
  trending?: boolean;
  editorsPick?: boolean;
  views: string;
  likeCount: number;
  saveCount: number;
  tags: string[];
  body: string[];
}

export const postHref = (post: Pick<Post, "type" | "slug">) =>
  `/${post.type === "news" ? "news" : "articles"}/${post.slug}`;

export const CATEGORIES = [
  "Politics",
  "Technology",
  "Business",
  "Sports",
  "Health",
  "Education",
  "Science",
  "International",
  "Entertainment",
  "Local",
] as const;
