import { NextRequest, NextResponse } from "next/server";
import { askClaudeForJSON, AnthropicNotConfiguredError } from "@/lib/anthropic";

interface VocabResult {
  pronunciation: string;
  meaning: string;
  example: string;
  synonyms: string[];
}

const SYSTEM = `You are a vocabulary assistant embedded in a news reading app.
Given a single word and the sentence it appeared in, respond with ONLY a JSON
object (no markdown, no prose) with this exact shape:
{"pronunciation": "phonetic respelling like 'ri-KAL-uh-brayt'", "meaning": "one plain-English sentence", "example": "one new short example sentence using the word", "synonyms": ["word1", "word2", "word3"]}
Keep the meaning under 20 words. Use the word's sense as used in the given sentence.`;

export async function POST(req: NextRequest) {
  try {
    const { word, sentence } = await req.json();
    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "Missing 'word'" }, { status: 400 });
    }

    const result = await askClaudeForJSON<VocabResult>(
      SYSTEM,
      `Word: "${word}"\nSentence: "${sentence ?? ""}"`
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      return NextResponse.json(
        { error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to look up word" }, { status: 500 });
  }
}
