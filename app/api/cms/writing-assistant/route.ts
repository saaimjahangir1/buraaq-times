import { NextRequest, NextResponse } from "next/server";
import { askClaudeForJSON } from "@/lib/anthropic";
import { requireApprovedUser, isNextResponse } from "@/lib/cms-guard";
import { rateLimit } from "@/lib/rate-limit";
import { aiErrorResponse, toText, toTextList } from "@/lib/ai-errors";

// Gemini can take 10–25 seconds (with retries) on a long draft.
export const maxDuration = 30;

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
  const { ok } = await rateLimit(`ai-writing:${guard.id}`, 30, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "You've used the AI assistant a lot this hour — try again later." }, { status: 429 });

  try {
    const { title, bodyHtml } = await req.json();
    if (!title || !bodyHtml) {
      return NextResponse.json({ error: "Missing 'title' or 'bodyHtml'" }, { status: 400 });
    }
    const plainText = String(bodyHtml).slice(0, 300_000).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 40_000);

    const raw = await askClaudeForJSON<Partial<Record<keyof WritingResult, unknown>>>(
      SYSTEM,
      `Title: ${title}\n\nBody:\n${plainText.slice(0, 6000)}`
    );

    // Always the shape the panel expects, whatever the AI sent back.
    const result: WritingResult = {
      grammarNotes: toTextList(raw?.grammarNotes, 4),
      toneSuggestion: toText(raw?.toneSuggestion),
      headlineSuggestions: toTextList(raw?.headlineSuggestions, 3),
      imagePromptSuggestion: toText(raw?.imagePromptSuggestion),
      factCheckReminders: toTextList(raw?.factCheckReminders, 3),
    };
    return NextResponse.json(result);
  } catch (err) {
    return aiErrorResponse(err, "writing-assistant");
  }
}
