import { NextRequest, NextResponse } from "next/server";
import { askClaudeForJSON, AnthropicNotConfiguredError } from "@/lib/anthropic";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

interface SeoResult {
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  tags: string[];
  ogDescription: string;
  twitterDescription: string;
  slugSuggestion: string;
  readabilityScore: number;
  seoScore: number;
  contentQualityScore: number;
  headingOptimization: string;
  keywordDensityNote: string;
  contentLengthSuggestion: string;
  internalLinkingSuggestions: string[];
  imageAltSuggestion: string;
  schemaSuggestion: string;
  duplicateContentNote: string;
}

const SYSTEM = `You are the AI SEO Assistant inside a news publishing CMS. Given a
post's title and body, respond with ONLY a JSON object (no markdown, no prose)
with this exact shape:
{
  "seoTitle": "under 60 chars, includes the focus keyword",
  "seoDescription": "under 155 chars, compelling meta description",
  "focusKeyword": "the single primary target keyword/phrase",
  "secondaryKeywords": ["3-5 related keywords/phrases"],
  "tags": ["4-6 short topical tags"],
  "ogDescription": "under 110 chars, social-share framing",
  "twitterDescription": "under 200 chars",
  "slugSuggestion": "lowercase-hyphenated-url-slug",
  "readabilityScore": 0-100,
  "seoScore": 0-100,
  "contentQualityScore": 0-100,
  "headingOptimization": "one short sentence of feedback on heading structure/usage",
  "keywordDensityNote": "one short sentence on keyword usage/repetition",
  "contentLengthSuggestion": "one short sentence on whether length suits the topic",
  "internalLinkingSuggestions": ["2-3 short phrases naming topics worth linking to"],
  "imageAltSuggestion": "one descriptive alt-text suggestion for the featured image",
  "schemaSuggestion": "one short sentence naming the best schema.org type and why",
  "duplicateContentNote": "one short sentence flagging any generic/boilerplate phrasing risk, or 'No concerns.'"
}
All scores are integers. Keep every string field concise.`;

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  try {
    const { title, summary, bodyHtml } = await req.json();
    if (!title || !bodyHtml) {
      return NextResponse.json({ error: "Missing 'title' or 'bodyHtml'" }, { status: 400 });
    }
    const plainText = String(bodyHtml).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const result = await askClaudeForJSON<SeoResult>(
      SYSTEM,
      `Title: ${title}\n\nSummary: ${summary ?? ""}\n\nBody:\n${plainText.slice(0, 6000)}`
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      return NextResponse.json(
        { error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "SEO analysis failed" }, { status: 500 });
  }
}
