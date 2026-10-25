import "server-only";
import { NextResponse } from "next/server";
import { AnthropicNotConfiguredError, GeminiBadResponseError, GeminiBusyError } from "./anthropic";

/**
 * Turns an AI failure into a clear message for the CMS instead of a bare
 * "500", and logs the real cause (see it with: pm2 logs buraaq-times).
 */
export function aiErrorResponse(err: unknown, feature: string) {
  if (err instanceof AnthropicNotConfiguredError) {
    return NextResponse.json({ error: "AI isn't set up on this server yet (GEMINI_API_KEY is missing)." }, { status: 503 });
  }
  if (err instanceof GeminiBusyError) {
    console.error(`[${feature}] Gemini busy (last status ${err.status})`);
    return NextResponse.json(
      { error: "Google's AI is busy right now. Please try again in a minute." },
      { status: 503, headers: { "Retry-After": "30" } }
    );
  }
  if (err instanceof GeminiBadResponseError) {
    console.error(`[${feature}] Gemini kept returning an unreadable answer`);
    return NextResponse.json({ error: "The AI's answer came back incomplete. Please try again." }, { status: 502 });
  }
  console.error(`[${feature}] failed:`, err);
  const msg = err instanceof Error ? err.message : "";
  if (/Gemini API error (400|403|404)/.test(msg)) {
    return NextResponse.json(
      { error: "Google's AI refused the request — check GEMINI_API_KEY and GEMINI_MODEL on the server." },
      { status: 502 }
    );
  }
  return NextResponse.json({ error: "Something went wrong with the AI. Please try again." }, { status: 500 });
}

/** The AI sometimes returns objects where text is expected; always hand the panel plain strings. */
export function toText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join("; ");
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).map(toText).filter(Boolean).join(" → ");
  return "";
}

export function toTextList(v: unknown, max: number): string[] {
  const arr = Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  return arr.map(toText).filter(Boolean).slice(0, max);
}
