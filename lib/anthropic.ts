import "server-only";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
// Optional: a second model to try when the main one is overloaded.
// Set GEMINI_FALLBACK_MODEL in .env (VPS) and in Vercel's env vars to enable it.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";

// Status codes that mean "Google is busy / temporary problem" — worth retrying.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
// Wait before retry #1 and retry #2 (per model).
const RETRY_DELAYS_MS = [1000, 2500];
// Never spend more than this in total, so serverless functions don't time out.
const TOTAL_BUDGET_MS = 25_000;

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
    this.name = "AnthropicNotConfiguredError";
  }
}

/** Gemini stayed overloaded/unavailable after all retries. Routes should answer 503, not 500. */
export class GeminiBusyError extends Error {
  constructor(public status: number) {
    super(`Gemini is temporarily unavailable (last status ${status})`);
    this.name = "GeminiBusyError";
  }
}

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function callModel(model: string, apiKey: string, system: string, userPrompt: string, timeoutMs: number) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
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
        // Thinking models spend part of this budget "thinking" before answering,
        // so leave plenty of room or long inputs get cut off mid-JSON.
        maxOutputTokens: 4096,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
}

function parseJSON<T>(data: GeminiResponse, model: string): T {
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    console.error(
      `[gemini] ${model} empty response (finishReason: ${candidate?.finishReason}). Payload:`,
      JSON.stringify(data).slice(0, 800)
    );
    throw new Error("Gemini returned an empty response");
  }

  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error(
      `[gemini] ${model} failed to parse JSON (finishReason: ${candidate?.finishReason}). Raw text:`,
      text.slice(0, 800)
    );
    throw e;
  }
}

export async function askClaudeForJSON<T>(system: string, userPrompt: string): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AnthropicNotConfiguredError();

  const models = FALLBACK_MODEL && FALLBACK_MODEL !== MODEL ? [MODEL, FALLBACK_MODEL] : [MODEL];
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastStatus = 0;

  for (const model of models) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) {
        const wait = RETRY_DELAYS_MS[attempt - 1];
        if (Date.now() + wait >= deadline) break; // no time left for this model
        await sleep(wait);
      }
      const remaining = deadline - Date.now();
      if (remaining < 1500) throw new GeminiBusyError(lastStatus);

      let res: Response;
      try {
        res = await callModel(model, apiKey, system, userPrompt, remaining);
      } catch (e) {
        // Network error or timeout: treat as temporary and retry.
        lastStatus = 0;
        console.error(`[gemini] ${model} request failed (attempt ${attempt + 1}):`, e instanceof Error ? e.message : e);
        continue;
      }

      if (res.ok) {
        if (attempt > 0 || model !== MODEL) console.log(`[gemini] succeeded with ${model} on attempt ${attempt + 1}`);
        return parseJSON<T>((await res.json()) as GeminiResponse, model);
      }

      const text = await res.text().catch(() => "");
      lastStatus = res.status;
      console.error(`[gemini] ${model} API error ${res.status} (attempt ${attempt + 1}):`, text.slice(0, 300));

      if (!RETRYABLE.has(res.status)) {
        throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
      }
    }
  }

  throw new GeminiBusyError(lastStatus);
}
