import { NextRequest, NextResponse } from "next/server";
import { askClaudeForJSON, AnthropicNotConfiguredError } from "@/lib/anthropic";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";

interface WritingResult {
  grammarNotes: string[];
  toneSuggestion: string;
  headlineSuggestions: string[];
  imagePromptSuggestion: string;
  factCheckReminders: string[];
}

const SYSTEM = `You are an AI writing assistant inside a news publishing CMS,
reviewing a draft before publish. Respond with ONLY a JSON object (no markdown,
no prose) with this exact shape:
{
  "grammarNotes": ["up to 4 short, specific grammar/clarity fixes — quote the exact phrase and the fix"],
  "toneSuggestion": "one short sentence of tone/voice feedback",
  "headlineSuggestions": ["3 alternative headline options"],
  "imagePromptSuggestion": "one short descriptive prompt for a featured-image generator matching the story",
  "factCheckReminders": ["up to 3 short reminders naming specific claims/numbers/quotes in the draft worth double-checking before publish — do not fabricate what the correct facts are"]
}`;

export async function POST(req: NextRequest) {
  const guard = await requireApprovedUser(req);
  if (isNextResponse(guard)) return guard;

  try {
    const { title, bodyHtml } = await req.json();
    if (!title || !bodyHtml) {
      return NextResponse.json({ error: "Missing 'title' or 'bodyHtml'" }, { status: 400 });
    }
    const plainText = String(bodyHtml).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const result = await askClaudeForJSON<WritingResult>(
      SYSTEM,
      `Title: ${title}\n\nBody:\n${plainText.slice(0, 6000)}`
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      return NextResponse.json(
        { error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Writing assistance failed" }, { status: 500 });
  }
}
