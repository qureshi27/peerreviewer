# Peer Reviewer — AI Review Panel

Submit any scientific manuscript and get a realistic, multi-reviewer peer review with a final
editorial decision — calibrated to the journal quartile you're targeting.

Each reviewer is a **digital twin powered by a different NVIDIA NIM model**, so the panel reasons
from genuinely independent vantage points instead of one model wearing several hats. A fifth model
acts as the handling editor and issues the decision: **Accepted · Minor Revision · Major Revision ·
Rejected**.

> Powered by **Albatross Technologies**.

## The panel

| Reviewer | Focus | Model |
| --- | --- | --- |
| Reviewer 1 | Methodology & Rigor | `qwen/qwen3-next-80b-a3b-instruct` |
| Reviewer 2 | Novelty & Significance | `meta/llama-4-maverick-17b-128e-instruct` |
| Reviewer 3 | Results & Validity | `mistralai/mistral-nemotron` |
| Reviewer 4 | Clarity & Reproducibility | `meta/llama-3.1-8b-instruct` |
| Handling Editor | Final decision | `abacusai/dracarys-llama-3.1-70b-instruct` |

These are deliberately **fast, reliable, non-reasoning** models that all support
`response_format: json_object`. Larger reasoning models (DeepSeek V4 Pro, GPT-OSS-120B, big
Nemotron/Qwen MoE) were tested and either return nothing within a web-request window or are too
slow, so they only ever time out.

> The results view has two tabs: **Consolidated Decision** (the final verdict plus a one-glance
> matrix of every reviewer's recommendation, score and confidence) and **Detailed Reviews** (the
> full per-reviewer cards).

Swap any model by editing [`lib/reviewers.ts`](lib/reviewers.ts) — any model id from
[build.nvidia.com](https://build.nvidia.com) works (the endpoint is OpenAI-compatible).

## How it works

1. **Submit** — upload a PDF (text is extracted in your browser; the file never leaves your device)
   or paste the manuscript text, then choose the target quartile (Q1–Q4).
2. **Four reviewers** read the paper in parallel and each return a structured, humanised review —
   summary, strengths, weaknesses, specific comments, questions, a recommendation and a score
   calibrated to the quartile bar.
3. **The editor** weighs the reviews against that bar and issues the final decision.

The reviews stream in live as each model finishes. Prompts are tuned to keep comments **realistic
and proportionate** — not over-ambitious, not artificially harsh — and the quartile sets the bar
(the same paper can be "Accept" at Q4 and "Major Revision" at Q1).

## Local development

```bash
npm install
# Ensure .env contains your NVIDIA key (see below)
npm run dev      # http://localhost:3000
```

Build / run the production server:

```bash
npm run build
npm start
```

## Environment variables

Create `.env` (already present locally) — see [`.env.example`](.env.example):

```
NVIDIA_API_KEY=nvapi-...            # required, server-side only (never exposed to the browser)
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1   # optional override
```

Optional tuning knobs (per-attempt wall-clock budgets):

```
REVIEWER_TIMEOUT_MS=26000   # per attempt; one retry fits inside a 60s function (26s + 26s)
EDITOR_TIMEOUT_MS=45000     # editor budget
```

## Deploy to Vercel

1. Push this folder to a Git repository and **Import** it in Vercel (it auto-detects Next.js).
2. In **Project → Settings → Environment Variables**, add `NVIDIA_API_KEY` (and optionally
   `NVIDIA_BASE_URL`). Do **not** prefix it with `NEXT_PUBLIC_` — the key must stay server-side.
3. Deploy.

### Architecture — why each reviewer is its own request

`build.nvidia.com` is a free, shared developer endpoint with **rate limits and variable latency**.
To stay robust against that, the work is split so each piece gets its own serverless invocation:

- The browser calls **`/api/review` once per reviewer, in parallel** — so each reviewer gets its own
  full ~60s function budget instead of four reviewers racing a single window. One slow model can't
  starve the others, and each card updates the moment its model replies.
- Each reviewer call **forces JSON** (`response_format: json_object`) and **retries once** on a parse
  miss — the per-attempt timeout (26s) is set so the retry still fits inside one 60s function.
- The browser then calls **`/api/decision`** with whatever reviews came back. The editor model
  synthesises them; if it's unavailable, a **deterministic fallback** derives the decision from the
  reviewers' scores — so a final decision is *always* returned.
- Completions are **streamed internally**, which avoids the gateway 504 that long non-streamed
  generations trigger.

A full run typically completes in ~30–60s. This fits Vercel's **Hobby** 60s cap because no single
function runs more than one reviewer (or the editor). Under heavy rate-limiting a reviewer may still
drop out, in which case the editor decides on the rest. For a dedicated, un-throttled deployment,
point `NVIDIA_BASE_URL` at your own NVIDIA NIM endpoint.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · NVIDIA NIM (OpenAI-compatible, JSON mode,
internal streaming) · `pdfjs-dist` for in-browser PDF extraction · per-reviewer parallel requests.

## Disclaimer

Reviews are AI-generated for guidance and rehearsal — to help authors anticipate reviewer concerns
before submission. They do not replace a journal's formal peer review.
