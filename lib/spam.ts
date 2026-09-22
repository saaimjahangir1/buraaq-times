import "server-only";
import { askClaudeForJSON } from "./anthropic";

const SPAM_WORDS = [
  "viagra", "casino", "crypto pump", "forex signal", "click here",
  "free money", "work from home", "weight loss pill", "enlarge",
  "hot singles", "nft giveaway", "act now", "limited time offer",
  "wire transfer", "bitcoin investment", "guaranteed profit",
];

interface SpamResult {
  score: number; // 0-100
  reason: string | null;
  autoFlag: boolean; // true => land as SPAM instead of PENDING
}

function heuristicScore(body: string, authorName: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const urlCount = (body.match(/https?:\/\/\S+/gi) || []).length;
  if (urlCount > 0) {
    score += Math.min(40, urlCount * 20);
    reasons.push(`${urlCount} link(s)`);
  }

  const letters = body.replace(/[^a-zA-Z]/g, "");
  const upper = body.replace(/[^A-Z]/g, "");
  if (letters.length > 15 && upper.length / letters.length > 0.6) {
    score += 15;
    reasons.push("mostly uppercase");
  }

  const lower = body.toLowerCase();
  const matchedWords = SPAM_WORDS.filter((w) => lower.includes(w));
  if (matchedWords.length > 0) {
    score += Math.min(50, matchedWords.length * 30);
    reasons.push(`flagged phrase(s): ${matchedWords.join(", ")}`);
  }

  if (/(.)\1{5,}/.test(body)) {
    score += 10;
    reasons.push("repeated characters");
  }

  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(authorName.trim())) {
    score += 5;
    reasons.push("name looks like an email address");
  }

  return { score: Math.min(100, score), reasons };
}

/**
 * Scores a submitted comment for spam likelihood. The heuristic layer
 * always runs (fast, free, no dependency). If ANTHROPIC_API_KEY is set,
 * an AI second opinion is layered on top and can raise (never lower) the
 * final score — best-effort: any AI failure just falls back to the
 * heuristic result rather than blocking the submission.
 */
export async function scoreComment(body: string, authorName: string): Promise<SpamResult> {
  const { score: heuristic, reasons } = heuristicScore(body, authorName);
  let score = heuristic;
  let aiReason: string | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const ai = await askClaudeForJSON<{ spamScore: number; reason: string }>(
        `You screen comments for spam on a news site. Respond with ONLY a JSON
object (no markdown, no prose): {"spamScore": 0-100, "reason": "one short phrase, or empty string if not spam"}.
Score high for promotional links, scams, or off-topic advertising. Score low
for genuine reader reactions, even critical or terse ones.`,
        `Comment: "${body}"`
      );
      score = Math.max(score, Math.min(100, ai.spamScore));
      if (ai.reason) aiReason = ai.reason;
    } catch {
      // Fall through to heuristic-only result.
    }
  }

  const reasonParts = [...reasons];
  if (aiReason) reasonParts.push(`AI: ${aiReason}`);

  return {
    score,
    reason: reasonParts.length ? reasonParts.join("; ") : null,
    autoFlag: score >= 60,
  };
}
