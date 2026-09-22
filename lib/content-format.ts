/**
 * Converts Tiptap-generated HTML into an array of plain-text paragraphs.
 *
 * Trade-off, documented deliberately: the public reading page renders these
 * plain-text paragraphs (so the AI Vocabulary Assistant, table-of-contents
 * anchors, and AI Summary/Insights — all built around `Post.body: string[]`
 * — keep working unchanged). That means rich inline formatting from the CMS
 * editor (bold, links, inline images, tables) does not currently render on
 * the public post page — only the text content survives. Swapping the
 * reading page over to render `bodyHtml` directly (with a DOM-based
 * approach to re-inject the vocabulary popovers) is the natural next step;
 * flagged in the README rather than shipped half-verified.
 */
export function htmlToParagraphs(html: string): string[] {
  if (!html) return [];
  const withBreaks = html
    .replace(/<\/(p|h[1-6]|li|blockquote|div|tr)>/gi, "$&\n\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  const decoded = stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}
