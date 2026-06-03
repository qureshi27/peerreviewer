import { NextRequest } from "next/server";
import { REVIEWERS, EDITOR } from "@/lib/reviewers";
import { complete, extractJson } from "@/lib/nvidia";
import {
  buildReviewerSystem,
  buildReviewerUser,
  buildEditorSystem,
  buildEditorUser,
} from "@/lib/prompts";
import type {
  EditorVerdict,
  Quartile,
  Recommendation,
  ReviewResult,
  ReviewerConfig,
  StreamEvent,
  FinalDecision,
} from "@/lib/types";

export const runtime = "nodejs";
// Vercel caps function duration by plan (Hobby = 60s). We budget the reviewer
// and editor calls below to finish comfortably inside that window; on Pro you
// can raise this to 300 and lengthen the per-call timeouts for longer papers.
export const maxDuration = 60;

// Per-call wall-clock budgets. Reviewers run in parallel, then the editor runs
// once. 42s + 15s leaves headroom under the 60s function ceiling, and any
// reviewer that blows its budget simply drops out — the editor decides on the
// rest rather than the whole request hanging.
const REVIEWER_TIMEOUT_MS = Number(process.env.REVIEWER_TIMEOUT_MS) || 40_000;
const EDITOR_TIMEOUT_MS = Number(process.env.EDITOR_TIMEOUT_MS) || 18_000;

const QUARTILES: Quartile[] = ["Q1", "Q2", "Q3", "Q4"];
// Cap the manuscript size to keep latency and token cost sane. ~60k chars is
// well beyond a typical full paper's body text.
const MAX_CHARS = 60_000;

const RECS: Recommendation[] = ["Accept", "Minor Revision", "Major Revision", "Reject"];
const DECISIONS: FinalDecision[] = ["Accepted", "Minor Revision", "Major Revision", "Rejected"];

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

function sanitizeReview(raw: any): ReviewResult {
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

function sanitizeVerdict(raw: any): EditorVerdict {
  return {
    decision: normDecision(raw?.decision),
    metaReview: String(raw?.metaReview ?? "").trim() || "No meta-review returned.",
    decisionRationale: String(raw?.decisionRationale ?? "").trim() || "—",
    quartileAssessment: String(raw?.quartileAssessment ?? "").trim() || "—",
    priorityActions: arr(raw?.priorityActions),
  };
}

/**
 * Deterministic editorial decision derived straight from the completed reviews.
 * Used as a guaranteed fallback when the editor model is unavailable or times
 * out, so the user ALWAYS gets a final decision rather than just the reviews.
 */
function fallbackVerdict(
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

  // A reject recommendation from the majority overrides a soft average.
  const rejects = completed.filter((c) => c.review.recommendation === "Reject").length;
  if (rejects > completed.length / 2) decision = "Rejected";

  const recSummary = completed
    .map((c) => `${c.reviewer.name}: ${c.review.recommendation} (${c.review.score}/10)`)
    .join("; ");

  // Surface the most pressing points: major comments first, then weaknesses.
  const majorComments = completed
    .flatMap((c) => c.review.comments.filter((cm) => cm.severity === "major").map((cm) => cm.comment));
  const weaknesses = completed.flatMap((c) => c.review.weaknesses);
  const priorityActions = Array.from(new Set([...majorComments, ...weaknesses])).slice(0, 4);

  return {
    decision,
    metaReview: `Based on ${completed.length} completed review${completed.length === 1 ? "" : "s"}, the panel's aggregate assessment for this ${quartile} venue is "${decision}" (average score ${avg.toFixed(1)}/10). This summary was compiled directly from the reviewers' scores and recommendations because the editorial synthesis model was unavailable; the individual reviews above carry the detailed reasoning.`,
    decisionRationale: `Reviewer recommendations — ${recSummary}.`,
    quartileAssessment: `Scores are calibrated to the ${quartile} bar, and the decision threshold reflects that target.`,
    priorityActions,
  };
}

async function runReviewer(
  reviewer: ReviewerConfig,
  paperText: string,
  quartile: Quartile
): Promise<ReviewResult> {
  const text = await complete({
    model: reviewer.model,
    system: buildReviewerSystem(reviewer, quartile),
    user: buildReviewerUser(paperText),
    temperature: 0.5,
    maxTokens: 1300,
    timeoutMs: REVIEWER_TIMEOUT_MS,
  });
  return sanitizeReview(extractJson<any>(text));
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), { status: 400 });
  }

  const paperText = String(body?.paperText ?? "").trim();
  const quartile = body?.quartile as Quartile;

  if (paperText.length < 300) {
    return new Response(
      JSON.stringify({ error: "The manuscript text is too short to review (need at least ~300 characters)." }),
      { status: 400 }
    );
  }
  if (!QUARTILES.includes(quartile)) {
    return new Response(JSON.stringify({ error: "Invalid quartile. Use Q1–Q4." }), { status: 400 });
  }
  if (!process.env.NVIDIA_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server is missing NVIDIA_API_KEY. Set it in the environment." }),
      { status: 500 }
    );
  }

  const trimmed = paperText.slice(0, MAX_CHARS);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

      try {
        send({ type: "status", message: "Briefing the review panel…" });
        for (const r of REVIEWERS) {
          const { model, ...pub } = r;
          send({ type: "reviewer_start", reviewer: pub });
        }

        // Run the reviewers concurrently, but stagger their launches by a few
        // hundred ms so we don't hit the shared NVIDIA endpoint with a burst of
        // simultaneous requests (a common trigger for 429 rate-limiting). Each
        // streams its result the moment it finishes.
        const completed: { reviewer: ReviewerConfig; review: ReviewResult }[] = [];
        await Promise.all(
          REVIEWERS.map(async (r, i) => {
            if (i > 0) await new Promise((res) => setTimeout(res, i * 600));
            try {
              const review = await runReviewer(r, trimmed, quartile);
              completed.push({ reviewer: r, review });
              send({ type: "reviewer_done", reviewerId: r.id, review });
            } catch (err: any) {
              send({
                type: "reviewer_error",
                reviewerId: r.id,
                message: err?.message ? String(err.message) : "Reviewer failed to respond.",
              });
            }
          })
        );

        if (completed.length === 0) {
          send({ type: "error", message: "All reviewers failed to respond. Check the NVIDIA API key and model availability." });
          controller.close();
          return;
        }

        // Editorial synthesis.
        send({ type: "editor_start" });
        try {
          const text = await complete({
            model: EDITOR.model,
            system: buildEditorSystem(quartile),
            user: buildEditorUser(completed),
            temperature: 0.4,
            maxTokens: 800,
            timeoutMs: EDITOR_TIMEOUT_MS,
          });
          const verdict = sanitizeVerdict(extractJson<any>(text));
          send({ type: "editor_done", verdict });
        } catch {
          // The editor model failed or timed out — fall back to a deterministic
          // decision derived from the reviews so a verdict is always delivered.
          send({ type: "editor_done", verdict: fallbackVerdict(completed, quartile) });
        }
      } catch (err: any) {
        send({ type: "error", message: err?.message ? String(err.message) : "Unexpected server error." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
