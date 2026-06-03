import type { PublicReviewer, Recommendation, ReviewResult } from "@/lib/types";
import { IconCheck, IconUser, IconX, Spinner } from "./icons";

export type CardStatus = "pending" | "working" | "done" | "error";

const REC_STYLE: Record<Recommendation, string> = {
  Accept: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  "Minor Revision": "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  "Major Revision": "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  Reject: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
};

function Bar({ value, max, hue }: { value: number; max: number; hue: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-pill bg-white/10">
      <div
        className="h-full rounded-pill transition-all duration-700"
        style={{ width: `${(value / max) * 100}%`, background: hue }}
      />
    </div>
  );
}

function List({ items, marker }: { items: string[]; marker: string }) {
  if (!items.length) return <p className="text-sm text-text-tertiary">None noted.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm text-text-secondary">
          <span className="mt-0.5 shrink-0 select-none">{marker}</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReviewerCard({
  reviewer,
  status,
  review,
  errorMsg,
}: {
  reviewer: PublicReviewer;
  status: CardStatus;
  review?: ReviewResult;
  errorMsg?: string;
}) {
  return (
    <article
      className="card animate-fadeUp overflow-hidden p-0"
      style={{ borderColor: status === "done" ? `${reviewer.hue}33` : undefined }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-subtle p-5">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md ring-1"
          style={{ background: `${reviewer.hue}22`, color: reviewer.hue, borderColor: `${reviewer.hue}55` }}
        >
          <IconUser width={20} height={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{reviewer.name}</h3>
          <p className="text-sm text-text-secondary">{reviewer.role}</p>
          <span className="chip mt-2 !py-0.5 !text-xs font-mono">{reviewer.modelLabel}</span>
        </div>
        {status === "done" && review && (
          <div className="shrink-0 text-right">
            <span
              className={`inline-block rounded-pill px-3 py-1 text-xs font-semibold ring-1 ${REC_STYLE[review.recommendation]}`}
            >
              {review.recommendation}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {status === "pending" && (
          <p className="text-sm text-text-tertiary">Waiting to be briefed…</p>
        )}

        {status === "working" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Spinner width={16} height={16} /> Reading the manuscript and drafting comments…
            </div>
            <div className="space-y-2">
              {[90, 75, 82].map((w, i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-start gap-2 rounded-md bg-rose-500/10 p-3 text-sm text-rose-300 ring-1 ring-rose-400/20">
            <IconX width={16} height={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg || "This reviewer could not complete the review."}</span>
          </div>
        )}

        {status === "done" && review && (
          <div className="space-y-5">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-text-tertiary">
                  <span>Score vs. bar</span>
                  <span className="font-mono text-text-secondary">{review.score}/10</span>
                </div>
                <Bar value={review.score} max={10} hue={reviewer.hue} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-text-tertiary">
                  <span>Confidence</span>
                  <span className="font-mono text-text-secondary">{review.confidence}/5</span>
                </div>
                <Bar value={review.confidence} max={5} hue={reviewer.hue} />
              </div>
            </div>

            <p className="text-sm leading-relaxed text-text-secondary">{review.summary}</p>

            <div>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                <IconCheck width={14} height={14} /> Strengths
              </h4>
              <List items={review.strengths} marker="+" />
            </div>

            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                Weaknesses
              </h4>
              <List items={review.weaknesses} marker="–" />
            </div>

            {review.comments.length > 0 && (
              <details className="group rounded-md border border-subtle bg-surface/60">
                <summary className="cursor-pointer select-none list-none p-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Detailed comments ({review.comments.length})
                  <span className="float-right text-text-tertiary transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>
                <ul className="space-y-3 border-t border-subtle p-3">
                  {review.comments.map((c, i) => (
                    <li key={i} className="text-sm">
                      <span
                        className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          c.severity === "major"
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-white/10 text-text-tertiary"
                        }`}
                      >
                        {c.severity}
                      </span>
                      <span className="font-medium text-text-primary">{c.section}</span>
                      <p className="mt-1 text-text-secondary">{c.comment}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {review.questionsForAuthors.length > 0 && (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                  Questions for the authors
                </h4>
                <List items={review.questionsForAuthors} marker="?" />
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
