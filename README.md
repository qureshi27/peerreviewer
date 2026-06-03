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
| Reviewer 1 | Methodology & Rigor | `meta/llama-3.3-70b-instruct` |
| Reviewer 2 | Novelty & Significance | `meta/llama-3.1-70b-instruct` |
| Reviewer 3 | Results & Validity | `qwen/qwen3-next-80b-a3b-instruct` |
| Reviewer 4 | Clarity & Reproducibility | `mistralai/mixtral-8x7b-instruct-v0.1` |
| Handling Editor | Final decision | `abacusai/dracarys-llama-3.1-70b-instruct` |

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

Optional tuning knobs (defaults are tuned for Vercel's 60s function limit):

```
REVIEWER_TIMEOUT_MS=33000   # per-reviewer wall-clock budget
EDITOR_TIMEOUT_MS=22000     # editor wall-clock budget
```

## Deploy to Vercel

1. Push this folder to a Git repository and **Import** it in Vercel (it auto-detects Next.js).
2. In **Project → Settings → Environment Variables**, add `NVIDIA_API_KEY` (and optionally
   `NVIDIA_BASE_URL`). Do **not** prefix it with `NEXT_PUBLIC_` — the key must stay server-side.
3. Deploy.

### A note on timing & the NVIDIA endpoint

`build.nvidia.com` is a free, shared developer endpoint with **rate limits and variable latency**.
The app is built to handle this gracefully:

- Reviewers run in parallel with a per-call timeout, so one slow model can't hang the request.
- If a reviewer times out, the editor simply decides on the reviews that completed.
- If the editor model itself is unavailable, a **deterministic fallback** derives the final decision
  from the reviewers' scores — so a decision is *always* returned.

A full 4-reviewer + editor run typically takes ~30–60s. On Vercel's **Hobby** plan (60s function
cap) this fits, but under heavy rate-limiting some reviewers may drop out. For consistent full-panel
results:

- Use **Vercel Pro** and raise `maxDuration` in [`app/api/review/route.ts`](app/api/review/route.ts)
  to e.g. `300`, then increase the timeout env vars above; **or**
- Use a dedicated NVIDIA NIM endpoint (set `NVIDIA_BASE_URL`) without the shared rate limits.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · NVIDIA NIM (OpenAI-compatible) ·
`pdfjs-dist` for in-browser PDF extraction · NDJSON streaming from the API route.

## Disclaimer

Reviews are AI-generated for guidance and rehearsal — to help authors anticipate reviewer concerns
before submission. They do not replace a journal's formal peer review.
