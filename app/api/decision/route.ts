import { NextRequest } from "next/server";
import { REVIEWERS, EDITOR } from "@/lib/reviewers";
import { QUARTILES, fallbackVerdict, runEditor, sanitizeReview } from "@/lib/review";
import type { Quartile, ReviewerConfig, ReviewResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST { quartile, reviews: [{ reviewerId, review }] } -> { verdict, viaFallback }
 * Always returns a verdict: the editor model if it responds, otherwise a
 * deterministic synthesis of the reviews.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const quartile = body?.quartile as Quartile;
  if (!QUARTILES.includes(quartile)) {
    return Response.json({ error: "Invalid quartile." }, { status: 400 });
  }

  const incoming = Array.isArray(body?.reviews) ? body.reviews : [];
  const completed: { reviewer: ReviewerConfig; review: ReviewResult }[] = [];
  for (const item of incoming) {
    const reviewer = REVIEWERS.find((r) => r.id === item?.reviewerId);
    if (reviewer && item?.review) {
      completed.push({ reviewer, review: sanitizeReview(item.review) });
    }
  }

  if (completed.length === 0) {
    return Response.json({ error: "No completed reviews to decide on." }, { status: 400 });
  }

  try {
    const verdict = await runEditor(EDITOR, completed, quartile);
    return Response.json({ verdict, viaFallback: false });
  } catch {
    return Response.json({ verdict: fallbackVerdict(completed, quartile), viaFallback: true });
  }
}
