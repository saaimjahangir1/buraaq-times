import { getPostsForIndexing } from "@/lib/public-data";
import { postHref } from "@/lib/types";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { xmlEscape } from "@/lib/xml";

// Google News sitemap: only stories from the last 2 days (Google's rule),
// so Google picks up fresh news within minutes of publishing.
export const revalidate = 300;

export async function GET() {
  const since = new Date(Date.now() - 2 * 86_400_000);
  const posts = (await getPostsForIndexing({ limit: 1000 })).filter((p) => p.publishedAt >= since);

  const urls = posts
    .map(
      (p) => `  <url>
    <loc>${xmlEscape(`${SITE_URL}${postHref(p)}`)}</loc>
    <lastmod>${p.updatedAt.toISOString()}</lastmod>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${p.publishedAt.toISOString()}</news:publication_date>
      <news:title>${xmlEscape(p.title)}</news:title>
    </news:news>${
      p.image
        ? `
    <image:image>
      <image:loc>${xmlEscape(p.image)}</image:loc>
    </image:image>`
        : ""
    }
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
