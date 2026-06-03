import type { EditorVerdict, PublicReviewer, Recommendation, ReviewResult } from "@/lib/types";
import type { CardStatus } from "./ReviewerCard";
import DecisionBanner from "./DecisionBanner";
import { Spinner } from "./icons";

const REC_STYLE: Record<Recommendation, string> = {
  Accept: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  "Minor Revision": "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  "Major Revision": "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  Reject: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
};

interface RState {
  status: CardStatus;
  review?: ReviewResult;
  error?: string;
}

function StatusCell({ s }: { s: RState }) {
  if (s.status === "done" && s.review) {
    return (
      <span
        className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-semibold ring-1 ${REC_STYLE[s.review.recommendation]}`}
      >
        {s.review.recommendation}
      </span>
    );
  }
  if (s.status === "working")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
        <Spinner width={13} height={13} /> reviewing…
      </span>
    );
  if (s.status === "error")
    return <span className="text-xs text-rose-300/80">unavailable</span>;
  return <span className="text-xs text-text-tertiary">pending</span>;
}

export default function ConsolidatedPanel({
  panel,
  states,
  editorStatus,
  verdict,
  quartile,
}: {
  panel: PublicReviewer[];
  states: Record<string, RState>;
  editorStatus: "idle" | "working" | "done";
  verdict?: EditorVerdict;
  quartile?: string;
}) {
  const done = panel
    .map((r) => states[r.id])
    .filter((s): s is RState & { review: ReviewResult } => s?.status === "done" && !!s.review);
  const avgScore = done.length
    ? (done.reduce((a, s) => a + s.review.score, 0) / done.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Final decision */}
      {editorStatus !== "idle" ? (
        <DecisionBanner status={editorStatus} verdict={verdict} quartile={quartile} />
      ) : (
        <div className="card flex items-center gap-3 p-6 text-text-secondary">
          <Spinner width={18} height={18} className="text-accent" />
          The panel is still reviewing — the consolidated decision appears here once reviews are in.
        </div>
      )}

      {/* Reviewer recommendation matrix */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-subtle p-5">
          <h3 className="font-semibold">Reviewer recommendations</h3>
          {avgScore && (
            <span className="chip !py-1 font-mono text-xs">
              avg score {avgScore}/10 · {done.length}/{panel.length} in
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-subtle text-xs uppercase tracking-wide text-text-tertiary">
                <th className="p-4 font-medium">Reviewer</th>
                <th className="p-4 font-medium">Model</th>
                <th className="p-4 font-medium">Recommendation</th>
                <th className="p-4 text-right font-medium">Score</th>
                <th className="p-4 text-right font-medium">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {panel.map((r) => {
                const s = states[r.id] ?? { status: "pending" as CardStatus };
                return (
                  <tr key={r.id} className="border-b border-subtle/60 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: r.hue }}
                        />
                        <div>
                          <div className="font-medium leading-tight">{r.name}</div>
                          <div className="text-xs text-text-tertiary">{r.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs text-text-secondary">{r.modelLabel}</span>
                    </td>
                    <td className="p-4">
                      <StatusCell s={s} />
                    </td>
                    <td className="p-4 text-right font-mono text-text-secondary">
                      {s.status === "done" && s.review ? `${s.review.score}/10` : "—"}
                    </td>
                    <td className="p-4 text-right font-mono text-text-secondary">
                      {s.status === "done" && s.review ? `${s.review.confidence}/5` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
