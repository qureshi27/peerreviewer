import type { EditorVerdict, FinalDecision } from "@/lib/types";
import { IconGavel, Spinner } from "./icons";

const DECISION_STYLE: Record<
  FinalDecision,
  { ring: string; text: string; glow: string; label: string }
> = {
  Accepted: {
    ring: "ring-emerald-400/40",
    text: "text-emerald-300",
    glow: "rgba(16,185,129,0.25)",
    label: "Accepted",
  },
  "Minor Revision": {
    ring: "ring-sky-400/40",
    text: "text-sky-300",
    glow: "rgba(56,189,248,0.25)",
    label: "Minor Revision",
  },
  "Major Revision": {
    ring: "ring-amber-400/40",
    text: "text-amber-300",
    glow: "rgba(251,191,36,0.25)",
    label: "Major Revision",
  },
  Rejected: {
    ring: "ring-rose-400/40",
    text: "text-rose-300",
    glow: "rgba(244,63,94,0.22)",
    label: "Rejected",
  },
};

export default function DecisionBanner({
  status,
  verdict,
  quartile,
}: {
  status: "idle" | "working" | "done";
  verdict?: EditorVerdict;
  quartile?: string;
}) {
  if (status === "idle") return null;

  if (status === "working" || !verdict) {
    return (
      <div className="card animate-fadeUp flex items-center gap-3 p-6">
        <Spinner width={20} height={20} className="text-accent" />
        <div>
          <p className="font-semibold">The handling editor is weighing the reviews…</p>
          <p className="text-sm text-text-tertiary">
            Synthesising four reports into a single decision.
          </p>
        </div>
      </div>
    );
  }

  const s = DECISION_STYLE[verdict.decision];

  return (
    <div
      className={`card animate-fadeUp overflow-hidden p-0 ring-1 ${s.ring}`}
      style={{ boxShadow: `0 30px 80px -30px ${s.glow}` }}
    >
      <div className="border-b border-subtle p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-md bg-white/5 ring-1 ${s.ring} ${s.text}`}>
              <IconGavel width={20} height={20} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest text-text-tertiary">
                Editorial decision{quartile ? ` · ${quartile} venue` : ""}
              </p>
              <h2 className={`text-2xl font-bold ${s.text}`}>{s.label}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Editor&apos;s letter
          </h3>
          <p className="leading-relaxed text-text-secondary">{verdict.metaReview}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Why this decision
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">{verdict.decisionRationale}</p>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Against the {quartile ?? "target"} bar
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">{verdict.quartileAssessment}</p>
          </div>
        </div>

        {verdict.priorityActions.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Priority actions
            </h3>
            <ol className="space-y-2">
              {verdict.priorityActions.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm text-text-secondary">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-accent/15 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <span>{a}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
