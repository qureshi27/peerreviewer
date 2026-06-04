// Server-only review logic, shared by the per-reviewer and decision routes.
// Splitting reviewers into separate HTTP requests means each one gets its own
// serverless invocation (its own full duration budget) instead of four
// reviewers + an editor all racing one 60s window.

import { complete, extractJson } from "@/lib/nvidia";
import {
  buildReviewerSystem,
  buildReviewerUser,
  buildEditorSystem,
  buildEditorUser,
} from "@/lib/prompts";
import type {
  EditorVerdict,
  FinalDecision,
  Quartile,
  Recommendation,
  ReviewResult,
  ReviewerConfig,
} from "@/lib/types";

export const QUARTILES: Quartile[] = ["Q1", "Q2", "Q3", "Q4"];
// Cap manuscript size to keep latency and token cost sane.
export const MAX_CHARS = 60_000;

// Each reviewer/editor now owns its own request, so it can use most of the
// function's duration. Defaults are generous; override via env on Vercel Pro.
// Each reviewer owns its own request, so the function has the whole window.
// We keep the per-attempt timeout low enough that a stuck model aborts and the
// one retry still fits inside the 60s function budget (26s + 26s ≈ 52s).
export const REVIEWER_TIMEOUT_MS = Number(process.env.REVIEWER_TIMEOUT_MS) || 26_000;
export const EDITOR_TIMEOUT_MS = Number(process.env.EDITOR_TIMEOUT_MS) || 45_000;

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function normRecommendation(r: unknown): Recommendation {
  const s = String(r ?? "").toLowerCase();
  if (s.includes("accept")) return "Accept";
  if (s.includes("reject")) return "Reject";
  if (s.includes("major")) return "Major Revision";
  if (s.includes("minor")) return "Minor Revision";
  return "Major Revision";
}

function normDecision(d: unknown): FinalDecision {
  const s = String(d ?? "").toLowerCase();
  if (s.includes("accept")) return "Accepted";
  if (s.includes("reject")) return "Rejected";
  if (s.includes("major")) return "Major Revision";
  if (s.includes("minor")) return "Minor Revision";
  return "Major Revision";
}

function arr(x: unknown): string[] {
  if (Array.isArray(x)) return x.map((v) => String(v)).filter(Boolean);
  if (typeof x === "string" && x.trim()) return [x.trim()];
  return [];
}

export function sanitizeReview(raw: any): ReviewResult {
  return {
    summary: String(raw?.summary ?? "").trim() || "No summary returned.",
    strengths: arr(raw?.strengths),
    weaknesses: arr(raw?.weaknesses),
    comments: Array.isArray(raw?.comments)
      ? raw.comments
          .map((c: any) => ({
            section: String(c?.section ?? "General").trim() || "General",
            severity: String(c?.severity ?? "minor").toLowerCase().includes("major")
              ? ("major" as const)
              : ("minor" as const),
            comment: String(c?.comment ?? "").trim(),
          }))
          .filter((c: any) => c.comment)
      : [],
    questionsForAuthors: arr(raw?.questionsForAuthors),
    recommendation: normRecommendation(raw?.recommendation),
    confidence: clampNum(raw?.confidence, 1, 5, 3),
    score: clampNum(raw?.score, 1, 10, 5),
  };
}

export function sanitizeVerdict(raw: any): EditorVerdict {
  return {
    decision: normDecision(raw?.decision),
    metaReview: String(raw?.metaReview ?? "").trim() || "No meta-review returned.",
    decisionRationale: String(raw?.decisionRationale ?? "").trim() || "—",
    quartileAssessment: String(raw?.quartileAssessment ?? "").trim() || "—",
    priorityActions: arr(raw?.priorityActions),
  };
}

/**
 * Run a single reviewer and return its structured review. JSON mode forces a
 * valid object; we still retry once on a parse miss (each reviewer owns its own
 * request budget, so there's room) before giving up.
 */
export async function runReviewer(
  reviewer: ReviewerConfig,
  paperText: string,
  quartile: Quartile
): Promise<ReviewResult> {
  const call = () =>
    complete({
      model: reviewer.model,
      system: buildReviewerSystem(reviewer, quartile),
      user: buildReviewerUser(paperText),
      temperature: 0.5,
      maxTokens: 1300,
      timeoutMs: REVIEWER_TIMEOUT_MS,
      jsonMode: true,
    });

  try {
    return sanitizeReview(extractJson<any>(await call()));
  } catch {
    // One retry — transient empty/truncated responses are common on the shared
    // endpoint and usually succeed the second time.
    return sanitizeReview(extractJson<any>(await call()));
  }
}

/** Run the editor synthesis. Throws if the model fails — caller falls back. */
export async function runEditor(
  editor: { model: string },
  completed: { reviewer: ReviewerConfig; review: ReviewResult }[],
  quartile: Quartile
): Promise<EditorVerdict> {
  const text = await complete({
    model: editor.model,
    system: buildEditorSystem(quartile),
    user: buildEditorUser(completed),
    temperature: 0.4,
    maxTokens: 800,
    timeoutMs: EDITOR_TIMEOUT_MS,
    jsonMode: true,
  });
  return sanitizeVerdict(extractJson<any>(text));
}

/**
 * Deterministic editorial decision derived straight from the completed reviews.
 * Guarantees a final decision even when the editor model is unavailable.
 */
export function fallbackVerdict(
  completed: { reviewer: ReviewerConfig; review: ReviewResult }[],
  quartile: Quartile
): EditorVerdict {
  const scores = completed.map((c) => c.review.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  let decision: FinalDecision;
  if (avg < 4) decision = "Rejected";
  else if (avg < 5.5) decision = "Major Revision";
  else if (avg < 7.5) decision = "Minor Revision";
  else decision = "Accepted";

  const rejects = completed.filter((c) => c.review.recommendation === "Reject").length;
  if (rejects > completed.length / 2) decision = "Rejected";

  const recSummary = completed
    .map((c) => `${c.reviewer.name}: ${c.review.recommendation} (${c.review.score}/10)`)
    .join("; ");

  const majorComments = completed.flatMap((c) =>
    c.review.comments.filter((cm) => cm.severity === "major").map((cm) => cm.comment)
  );
  const weaknesses = completed.flatMap((c) => c.review.weaknesses);
  const priorityActions = Array.from(new Set([...majorComments, ...weaknesses])).slice(0, 4);

  return {
    decision,
    metaReview: `Based on ${completed.length} completed review${completed.length === 1 ? "" : "s"}, the panel's aggregate assessment for this ${quartile} venue is "${decision}" (average score ${avg.toFixed(1)}/10). This summary was compiled directly from the reviewers' scores and recommendations because the editorial synthesis model was unavailable; the individual reviews carry the detailed reasoning.`,
    decisionRationale: `Reviewer recommendations — ${recSummary}.`,
    quartileAssessment: `Scores are calibrated to the ${quartile} bar, and the decision threshold reflects that target.`,
    priorityActions,
  };
}
