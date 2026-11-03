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
  /** Exact times for search engines (ISO 8601). `date`/`updated` are for display. */
  publishedAt?: string;
  updatedAt?: string;
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

/** A public comment as the reader sees it (replies nested one level). */
export interface CommentView {
  id: string;
  name: string;
  text: string;
  createdAt: string; // ISO
  likes: number;
  dislikes: number;
  /** This visitor's vote, if any. */
  myVote: "LIKE" | "DISLIKE" | null;
  replyToName: string | null;
  replies: CommentView[];
  /** Only on the visitor's own just-posted comment (not yet approved). */
  pending?: boolean;
}
