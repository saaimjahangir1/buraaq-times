import { getPostsForIndexing } from "@/lib/public-data";
import { postHref } from "@/lib/types";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, LOGO_URL } from "@/lib/seo";
import { xmlEscape } from "@/lib/xml";

// RSS feed of the latest 50 stories — used by news readers, Bing, Google News
// and other aggregators to pick up new stories quickly.
export const revalidate = 300;

export async function GET() {
  const posts = await getPostsForIndexing({ limit: 50 });
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}${postHref(p)}`;
      return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${p.publishedAt.toUTCString()}</pubDate>
      <dc:creator>${xmlEscape(p.author)}</dc:creator>
      <category>${xmlEscape(p.category)}</category>
      <description>${xmlEscape(p.summary)}</description>${
        p.image ? `\n      <media:content url="${xmlEscape(p.image)}" medium="image" />` : ""
      }
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xmlEscape(SITE_NAME)}</title>
    <link>${SITE_URL}/</link>
    <description>${xmlEscape(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${(posts[0]?.updatedAt ?? new Date()).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image><url>${LOGO_URL}</url><title>${xmlEscape(SITE_NAME)}</title><link>${SITE_URL}/</link></image>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
