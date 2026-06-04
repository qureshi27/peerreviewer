import { NextRequest } from "next/server";
import { REVIEWERS } from "@/lib/reviewers";
import { MAX_CHARS, QUARTILES, runReviewer } from "@/lib/review";
import type { Quartile } from "@/lib/types";

export const runtime = "nodejs";
// One reviewer per request, so each gets (almost) the whole window to respond.
// On Vercel Pro you can raise this; the client runs all reviewers in parallel,
// so each is its own invocation rather than sharing a single 60s budget.
export const maxDuration = 60;

/** POST { reviewerId, paperText, quartile } -> { review } | { error } */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const reviewerId = String(body?.reviewerId ?? "");
  const paperText = String(body?.paperText ?? "").trim();
  const quartile = body?.quartile as Quartile;

  const reviewer = REVIEWERS.find((r) => r.id === reviewerId);
  if (!reviewer) {
    return Response.json({ error: `Unknown reviewer "${reviewerId}".` }, { status: 400 });
  }
  if (paperText.length < 300) {
    return Response.json({ error: "Manuscript text is too short." }, { status: 400 });
  }
  if (!QUARTILES.includes(quartile)) {
    return Response.json({ error: "Invalid quartile." }, { status: 400 });
  }
  if (!process.env.NVIDIA_API_KEY) {
    return Response.json({ error: "Server is missing NVIDIA_API_KEY." }, { status: 500 });
  }

  try {
    const review = await runReviewer(reviewer, paperText.slice(0, MAX_CHARS), quartile);
    return Response.json({ review });
  } catch (err: any) {
    return Response.json(
      { error: err?.message ? String(err.message) : "Reviewer failed to respond." },
      { status: 502 }
    );
  }
}
