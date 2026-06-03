// Shared types for the peer-review panel.

export type Quartile = "Q1" | "Q2" | "Q3" | "Q4";

export type Recommendation =
  | "Accept"
  | "Minor Revision"
  | "Major Revision"
  | "Reject";

export type FinalDecision =
  | "Accepted"
  | "Minor Revision"
  | "Major Revision"
  | "Rejected";

/** A single numbered comment a reviewer leaves on the manuscript. */
export interface ReviewComment {
  /** Section / area the comment refers to, e.g. "Methods", "Section 3.2", "Figure 4". */
  section: string;
  /** "major" | "minor" — severity of the issue raised. */
  severity: "major" | "minor";
  /** The comment itself, phrased as a reviewer would write it. */
  comment: string;
}

/** Structured output produced by one reviewer twin. */
export interface ReviewResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  comments: ReviewComment[];
  questionsForAuthors: string[];
  recommendation: Recommendation;
  /** Reviewer self-rated confidence, 1 (low) – 5 (expert). */
  confidence: number;
  /** Overall manuscript score against the target quartile bar, 1–10. */
  score: number;
}

/** A reviewer persona bound to a specific NVIDIA model. */
export interface ReviewerConfig {
  id: string;
  /** Anonymised display name, e.g. "Reviewer 1". */
  name: string;
  /** Short human-readable focus, e.g. "Methodology & Rigor". */
  role: string;
  /** Longer description shown in the UI. */
  blurb: string;
  /** NVIDIA NIM model id powering this reviewer. */
  model: string;
  /** Friendly model label shown in the UI. */
  modelLabel: string;
  /** Accent hue used for this reviewer's card. */
  hue: string;
}

/** The editor's synthesis across all reviews. */
export interface EditorVerdict {
  decision: FinalDecision;
  metaReview: string;
  decisionRationale: string;
  /** How the chosen quartile bar shaped the decision. */
  quartileAssessment: string;
  /** The 2–4 changes that matter most for the authors. */
  priorityActions: string[];
}

/** Events streamed from /api/review to the client. */
export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "reviewer_start"; reviewer: PublicReviewer }
  | { type: "reviewer_done"; reviewerId: string; review: ReviewResult }
  | { type: "reviewer_error"; reviewerId: string; message: string }
  | { type: "editor_start" }
  | { type: "editor_done"; verdict: EditorVerdict }
  | { type: "error"; message: string };

/** Reviewer config minus anything we don't want to expose verbatim. */
export type PublicReviewer = Omit<ReviewerConfig, "model"> & {
  modelLabel: string;
};
