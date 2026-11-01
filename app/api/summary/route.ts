import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { askClaudeForJSON, AnthropicNotConfiguredError } from "@/lib/anthropic";

interface SummaryResult {
  quick: string;
  detailed: string;
  bullets: string[];
}

const SYSTEM = `You summarize news/article content for a reading-assistant panel.
Respond with ONLY a JSON object (no markdown, no prose) with this exact shape:
{"quick": "one sentence, under 25 words", "detailed": "a 3-4 sentence paragraph summary", "bullets": ["4-6 short bullet points covering the key facts, each under 15 words"]}`;

export async function POST(req: NextRequest) {
  try {
    // Public and paid per use: limit each visitor, and cap the text sent.
    const { ok } = await rateLimit(`ai-summary:${clientIp(req)}`, 10, 10 * 60_000);
    if (!ok) return NextResponse.json({ error: "Too many requests — try again in a few minutes." }, { status: 429 });

    const raw = await req.json();
    const title = typeof raw?.title === "string" ? raw.title.slice(0, 300) : "";
    const body = (Array.isArray(raw?.body) ? raw.body.map(String).join("\n\n") : String(raw?.body ?? "")).slice(0, 30_000);
    if (!title || !body) {
      return NextResponse.json({ error: "Missing 'title' or 'body'" }, { status: 400 });
    }

    const result = await askClaudeForJSON<SummaryResult>(
      SYSTEM,
      `Title: ${title}\n\nBody:\n${body}`
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      return NextResponse.json(
        { error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to summarize" }, { status: 500 });
  }
}
