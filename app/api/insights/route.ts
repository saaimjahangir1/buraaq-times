import { NextRequest, NextResponse } from "next/server";
import { askClaudeForJSON, AnthropicNotConfiguredError } from "@/lib/anthropic";

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
    const { title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: "Missing 'title' or 'body'" }, { status: 400 });
    }

    const result = await askClaudeForJSON<InsightsResult>(
      SYSTEM,
      `Title: ${title}\n\nBody:\n${Array.isArray(body) ? body.join("\n\n") : body}`
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      return NextResponse.json(
        { error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
