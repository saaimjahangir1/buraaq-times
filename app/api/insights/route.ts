import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { askClaudeForJSON, AnthropicNotConfiguredError, GeminiBusyError } from "@/lib/anthropic";

// Gives the retries in lib/anthropic.ts enough time on Vercel.
export const maxDuration = 30;

interface InsightsResult {
  angles: string[];
  openQuestions: string[];
}

// Note: this intentionally does NOT fabricate citation URLs or source names —
// doing so for placeholder news content would produce fake-looking
// references. Instead the model suggests genuine follow-up angles and open
// questions a reader could go research themselves.
const SYSTEM = `You help readers go deeper on a news story or article.
Respond with ONLY a JSON object (no markdown, no prose) with this exact shape:
{"angles": ["3-4 short phrases naming a related topic/angle worth reading more about"], "openQuestions": ["2-3 short open questions this story raises that aren't yet answered"]}
Do not invent specific source names, publications, or URLs.`;

export async function POST(req: NextRequest) {
  try {
    // Public and paid per use: limit each visitor, and cap the text sent.
    const { ok } = await rateLimit(`ai-insights:${clientIp(req)}`, 10, 10 * 60_000);
    if (!ok) return NextResponse.json({ error: "Too many requests — try again in a few minutes." }, { status: 429 });

    const raw = await req.json();
    const title = typeof raw?.title === "string" ? raw.title.slice(0, 300) : "";
    const body = (Array.isArray(raw?.body) ? raw.body.map(String).join("\n\n") : String(raw?.body ?? "")).slice(0, 30_000);
    if (!title || !body) {
      return NextResponse.json({ error: "Missing 'title' or 'body'" }, { status: 400 });
    }

    const result = await askClaudeForJSON<InsightsResult>(
      SYSTEM,
      `Title: ${title}\n\nBody:\n${body}`
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY to the environment variables." },
        { status: 503 }
      );
    }
    if (err instanceof GeminiBusyError) {
      return NextResponse.json(
        { error: "AI insights are busy right now. Please try again in a minute." },
        { status: 503, headers: { "Retry-After": "30" } }
      );
    }
    console.error("[insights] failed:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
