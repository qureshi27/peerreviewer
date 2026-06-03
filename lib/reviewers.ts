import type { ReviewerConfig } from "./types";

/**
 * The review panel. Each reviewer twin is a distinct persona backed by a
 * DIFFERENT NVIDIA NIM model, so the panel genuinely reasons from four
 * independent vantage points rather than one model wearing four hats.
 *
 * To swap a model, change the `model` id below to any model id available on
 * https://build.nvidia.com (the endpoint is OpenAI-compatible).
 */
export const REVIEWERS: ReviewerConfig[] = [
  {
    id: "methodology",
    name: "Reviewer 1",
    role: "Methodology & Rigor",
    blurb:
      "Scrutinises study design, statistics, controls, sample sizes and whether the methods can actually answer the research question.",
    model: "meta/llama-3.3-70b-instruct",
    modelLabel: "Llama 3.3 70B",
    hue: "#4D9BFF",
  },
  {
    id: "novelty",
    name: "Reviewer 2",
    role: "Novelty & Significance",
    blurb:
      "Weighs the contribution against the existing literature — is this new, important, and positioned correctly within the field?",
    model: "meta/llama-3.1-70b-instruct",
    modelLabel: "Llama 3.1 70B",
    hue: "#00D4FF",
  },
  {
    id: "validity",
    name: "Reviewer 3",
    role: "Results & Validity",
    blurb:
      "Checks whether the claims are actually supported by the evidence, hunts for over-claiming, confounds and unaddressed limitations.",
    model: "qwen/qwen3-next-80b-a3b-instruct",
    modelLabel: "Qwen3 Next 80B",
    hue: "#A78BFA",
  },
  {
    id: "clarity",
    name: "Reviewer 4",
    role: "Clarity & Reproducibility",
    blurb:
      "Reads as a careful generalist — structure, writing, figures, and whether another lab could reproduce the work from what's written.",
    model: "mistralai/mixtral-8x7b-instruct-v0.1",
    modelLabel: "Mixtral 8x7B",
    hue: "#FFD600",
  },
];

/**
 * The handling editor / area chair. Reads all four reviews, weighs them
 * against the target quartile bar, and issues the final editorial decision.
 * Powered by a fifth, distinct (and the most capable) model.
 */
export const EDITOR = {
  id: "editor",
  name: "Handling Editor",
  role: "Editorial Decision",
  model: "abacusai/dracarys-llama-3.1-70b-instruct",
  modelLabel: "Dracarys Llama 3.1 70B",
  hue: "#34D399",
};

export function publicReviewers() {
  return REVIEWERS.map(({ model, ...rest }) => rest);
}
