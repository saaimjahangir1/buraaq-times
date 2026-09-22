"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Heart,
  Share2,
  Clock,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Link2,
} from "lucide-react";
import { Post, postHref } from "@/lib/types";
import ReadingAssistant from "./ReadingAssistant";
import ParagraphWithVocab from "./ParagraphWithVocab";
import ProgressBar from "./ProgressBar";
import FurtherReading from "./FurtherReading";
import PostCard from "./PostCard";
import Reveal from "./Reveal";
import BrandMark from "@/components/BrandMark";

export interface ReaderPrefs {
  fontSize: number;
  lineHeight: number;
  width: number;
  font: "body" | "display" | "serif";
  focus: boolean;
  highlightMode: boolean;
}

interface CommentItem {
  id: string;
  name: string;
  text: string;
  pending?: boolean;
}

function sectionLabel(paragraph: string) {
  const words = paragraph.split(/\s+/).filter(Boolean);
  const label = words.slice(0, 4).join(" ");
  return words.length > 4 ? `${label}…` : label || "Section";
}

export default function PostReader({
  post,
  related,
  prev,
  next,
  initialComments = [],
  initialLiked = false,
  initialSaved = false,
}: {
  post: Post;
  related: Post[];
  prev?: Post;
  next?: Post;
  initialComments?: { id: string; name: string; text: string }[];
  initialLiked?: boolean;
  initialSaved?: boolean;
}) {
  const [prefs, setPrefs] = useState<ReaderPrefs>({
    fontSize: 18,
    lineHeight: 1.8,
    width: 68,
    font: "body",
    focus: false,
    highlightMode: false,
  });
  const [saved, setSaved] = useState(initialSaved);
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saveCount, setSaveCount] = useState(post.saveCount);
  const [pendingReaction, setPendingReaction] = useState<"LIKE" | "SAVE" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [copied, setCopied] = useState(false);

  // Fire-and-forget view tracking — best effort, never blocks rendering.
  useEffect(() => {
    fetch("/api/track-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: post.type, slug: post.slug }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.slug]);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!shareOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (shareRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setShareOpen(false);
    };
    const onScroll = () => setShareOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [shareOpen]);

  const shareUrl = () => (typeof window !== "undefined" ? window.location.href : "");

  const copyLink = async () => {
    const url = shareUrl();
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch {
      // fall through to manual fallback
    }
    if (!ok) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        ok = false;
      }
    }
    setCopied(ok);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleReaction = async (reaction: "LIKE" | "SAVE") => {
    if (pendingReaction) return;
    setPendingReaction(reaction);
    const wasActive = reaction === "LIKE" ? liked : saved;
    if (reaction === "LIKE") {
      setLiked(!wasActive);
      setLikeCount((c) => c + (wasActive ? -1 : 1));
    } else {
      setSaved(!wasActive);
      setSaveCount((c) => c + (wasActive ? -1 : 1));
    }
    try {
      const res = await fetch("/api/post-reaction", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: post.type, slug: post.slug, reaction }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLikeCount(data.likeCount);
      setSaveCount(data.saveCount);
      if (reaction === "LIKE") setLiked(data.active);
      else setSaved(data.active);
    } catch {
      if (reaction === "LIKE") {
        setLiked(wasActive);
        setLikeCount((c) => c + (wasActive ? 1 : -1));
      } else {
        setSaved(wasActive);
        setSaveCount((c) => c + (wasActive ? 1 : -1));
      }
    } finally {
      setPendingReaction(null);
    }
  };

  const fontClass =
    prefs.font === "display" ? "font-display" : prefs.font === "serif" ? "font-serif" : "font-body";

  return (
    <article className="relative">
      <ProgressBar />
      <ReadingAssistant post={{ title: post.title, body: post.body }} prefs={prefs} setPrefs={setPrefs} />

      {/* Hero */}
      <div className="relative mx-4 h-[70vh] min-h-[560px] overflow-hidden rounded-glass md:mx-8">
        <Image src={post.image} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <div className="absolute left-4 top-4 z-10 md:left-6 md:top-6">
          <BrandMark idle={false} className="aspect-[423/125] h-8 md:h-10 [filter:brightness(0)_invert(1)] drop-shadow-md" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-center md:p-10">
          <span className="mb-3 inline-block rounded-full bg-signal px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-white">
            {post.category}
          </span>
          <h1 className="mx-auto max-w-3xl font-display text-2xl font-bold leading-tight text-white md:text-4xl">
            {post.title}
          </h1>
        </div>
      </div>

      {/* Meta bar */}
      <div className="glass-strong mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-glass p-4 md:mx-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-signal to-cyanDeep font-display text-sm font-bold text-white">
            {post.author.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="text-sm">
            <p className="font-semibold text-ink dark:text-white">{post.author}</p>
            <p className="text-ink/50 dark:text-white/50">{post.authorRole}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-ink/50 dark:text-white/50">
          <span>Published {post.date}</span>
          {post.updated && <span>Updated {post.updated}</span>}
          <span className="flex items-center gap-1">
            <Clock size={12} /> {post.readTime}
          </span>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => toggleReaction("LIKE")}
            disabled={pendingReaction === "LIKE"}
            className={`glass-pill focus-ring flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100 ${
              liked ? "!border-signal !bg-signal text-white shadow-glow" : "text-ink/70 dark:text-white/70"
            }`}
          >
            <Heart size={15} fill={liked ? "currentColor" : "none"} /> Like{likeCount > 0 ? ` (${likeCount})` : ""}
          </button>
          <button
            onClick={() => toggleReaction("SAVE")}
            disabled={pendingReaction === "SAVE"}
            className={`glass-pill focus-ring flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100 ${
              saved ? "!border-signal !bg-signal text-white shadow-glow" : "text-ink/70 dark:text-white/70"
            }`}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} /> Save{saveCount > 0 ? ` (${saveCount})` : ""}
          </button>

          <div ref={shareRef} className="relative">
            <button
              onClick={() => {
                if (!shareOpen && shareRef.current) {
                  const rect = shareRef.current.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom + 8, left: Math.max(8, rect.right - 224) });
                }
                setShareOpen((o) => !o);
              }}
              className="glass-pill focus-ring flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ink/70 transition hover:scale-[1.03] dark:text-white/70"
            >
              <Share2 size={15} /> Share
            </button>

            {shareOpen && menuPos && createPortal(
              <div
                ref={menuRef}
                className="glass-strong z-[999] w-56 rounded-2xl p-2 shadow-2xl"
                style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
              >
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${shareUrl()}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/80 transition hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white">
                    <MessageCircle size={14} />
                  </span>
                  WhatsApp
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/80 transition hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] text-sm font-bold text-white">
                    f
                  </span>
                  Facebook
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/80 transition hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                    X
                  </span>
                  X
                </a>
                {canNativeShare && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share({ title: post.title, url: shareUrl() });
                        setShareOpen(false);
                      } catch {
                        // user cancelled the native sheet
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink/80 transition hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
                      <Share2 size={14} />
                    </span>
                    More (Instagram, etc.)
                  </button>
                )}
                <button
                  onClick={copyLink}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink/80 transition hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
                    <Link2 size={14} />
                  </span>
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* Body + TOC */}
      <div className="mx-4 mt-8 grid grid-cols-1 gap-8 md:mx-8 lg:grid-cols-[220px_1fr]">
        {!prefs.focus && (
          <aside className="hidden lg:block">
            <div className="glass-strong sticky top-28 rounded-glass p-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink/50 dark:text-white/40">
                On this page
              </p>
              <ul className="space-y-2 text-sm">
                {post.body.slice(0, 8).map((p, i) => (
                  <li key={i}>
                    <a
                      href={`#section-${i}`}
                      className="focus-ring block truncate rounded text-ink/60 transition hover:text-signal dark:text-white/60"
                    >
                      {sectionLabel(p)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <div className={prefs.focus ? "mx-auto" : ""} style={{ maxWidth: `${prefs.width}ch` }}>
          <div
            className={`${fontClass} ${prefs.highlightMode ? "selection:bg-signal/30" : ""} space-y-5 text-ink/85 dark:text-white/80`}
            style={{ fontSize: prefs.fontSize, lineHeight: prefs.lineHeight }}
          >
            <p className="font-display text-lg font-medium text-ink dark:text-white">
              {post.summary}
            </p>
            {post.body.map((p, i) => (
              <div id={`section-${i}`} key={i} className="scroll-mt-28">
                <ParagraphWithVocab text={p} />
              </div>
            ))}
          </div>

          {/* AI-suggested further reading (replaces static references) */}
          <FurtherReading title={post.title} body={post.body} />

          {/* Tags */}
          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t}
                className="glass-pill px-3 py-1 text-xs font-medium text-ink/60 dark:text-white/60"
              >
                #{t}
              </span>
            ))}
          </div>

          {/* Prev / Next */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {prev && (
              <Link
                href={postHref(prev)}
                className="glass focus-ring group flex items-center gap-2 rounded-glass p-4"
              >
                <ChevronLeft size={18} className="text-signal" />
                <div>
                  <p className="font-mono text-[10px] uppercase text-ink/40 dark:text-white/40">
                    Previous
                  </p>
                  <p className="line-clamp-1 text-sm font-medium text-ink group-hover:text-signal dark:text-white">
                    {prev.title}
                  </p>
                </div>
              </Link>
            )}
            {next && (
              <Link
                href={postHref(next)}
                className="glass focus-ring group flex items-center justify-end gap-2 rounded-glass p-4 text-right"
              >
                <div>
                  <p className="font-mono text-[10px] uppercase text-ink/40 dark:text-white/40">Next</p>
                  <p className="line-clamp-1 text-sm font-medium text-ink group-hover:text-signal dark:text-white">
                    {next.title}
                  </p>
                </div>
                <ChevronRight size={18} className="text-signal" />
              </Link>
            )}
          </div>

          {/* Comments */}
          {!prefs.focus && (
            <div className="mt-10">
              <p className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-ink dark:text-white">
                <MessageCircle size={18} /> Comments ({comments.length})
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCommentError(null);
                  if (!commentName.trim() || !commentEmail.trim() || !commentBody.trim()) {
                    setCommentError("Fill in your name, email, and a comment.");
                    return;
                  }
                  try {
                    const res = await fetch("/api/comments", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        type: post.type,
                        slug: post.slug,
                        authorName: commentName,
                        authorEmail: commentEmail,
                        body: commentBody,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to post comment");
                    setComments([{ ...data.comment, pending: true }, ...comments]);
                    setCommentBody("");
                  } catch (err) {
                    setCommentError(err instanceof Error ? err.message : "Failed to post comment");
                  }
                }}
                className="mb-5 space-y-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Name"
                    className="glass-pill focus-ring flex-1 px-4 py-2.5 text-sm outline-none dark:text-white"
                  />
                  <input
                    type="email"
                    value={commentEmail}
                    onChange={(e) => setCommentEmail(e.target.value)}
                    placeholder="Email (not shown publicly)"
                    className="glass-pill focus-ring flex-1 px-4 py-2.5 text-sm outline-none dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a comment..."
                    className="glass-pill focus-ring flex-1 px-4 py-2.5 text-sm outline-none dark:text-white"
                  />
                  <button
                    type="submit"
                    className="focus-ring rounded-full bg-signal px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Post
                  </button>
                </div>
                {commentError && <p className="text-xs text-red-500">{commentError}</p>}
              </form>
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="glass rounded-glass p-4 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-ink dark:text-white">
                      {c.name}
                      {c.pending && (
                        <span className="rounded-full bg-signal/10 px-2 py-0.5 text-[10px] font-medium uppercase text-signal">
                          Awaiting approval
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-ink/70 dark:text-white/70">{c.text}</p>
                  </li>
                ))}
                {comments.length === 0 && (
                  <p className="text-sm text-ink/40 dark:text-white/40">
                    Be the first to comment.
                  </p>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {!prefs.focus && related.length > 0 && (
        <section className="mx-4 mt-16 mb-16 md:mx-8">
          <Reveal>
            <p className="mb-6 font-display text-xl font-bold text-ink dark:text-white">
              Related {post.type === "news" ? "News" : "Articles"}
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.05}>
                <PostCard post={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
