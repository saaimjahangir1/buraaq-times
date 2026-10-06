import "server-only";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
    this.name = "AnthropicNotConfiguredError";
  }
}

export async function askClaudeForJSON<T>(system: string, userPrompt: string): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AnthropicNotConfiguredError();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[gemini] API error ${res.status}:`, text.slice(0, 800));
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string =
    data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("\n")
      .trim() ?? "";

  if (!text) {
    console.error("[gemini] Empty response, full payload:", JSON.stringify(data).slice(0, 800));
    throw new Error("Gemini returned an empty response");
  }

  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("[gemini] Failed to parse JSON. Raw text:", text.slice(0, 800));
    throw e;
  }
}
