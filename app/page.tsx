"use client";

import { useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UploadForm from "@/components/UploadForm";
import ReviewerCard, { type CardStatus } from "@/components/ReviewerCard";
import ConsolidatedPanel from "@/components/ConsolidatedPanel";
import { IconArrow, IconDoc, IconGavel, IconSpark, IconUser } from "@/components/icons";
import { publicReviewers, EDITOR } from "@/lib/reviewers";
import type {
  EditorVerdict,
  PublicReviewer,
  Quartile,
  ReviewResult,
} from "@/lib/types";

const PANEL = publicReviewers() as PublicReviewer[];

interface RState {
  status: CardStatus;
  review?: ReviewResult;
  error?: string;
}

function initialStates(): Record<string, RState> {
  return Object.fromEntries(PANEL.map((r) => [r.id, { status: "pending" as CardStatus }]));
}

export default function Home() {
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [states, setStates] = useState<Record<string, RState>>(initialStates);
  const [editorStatus, setEditorStatus] = useState<"idle" | "working" | "done">("idle");
  const [verdict, setVerdict] = useState<EditorVerdict | undefined>();
  const [quartile, setQuartile] = useState<Quartile | undefined>();
  const [statusMsg, setStatusMsg] = useState("");
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [tab, setTab] = useState<"decision" | "reviews">("decision");
  const resultsRef = useRef<HTMLDivElement>(null);

  async function startReview(paperText: string, q: Quartile) {
    setRunning(true);
    setStarted(true);
    setStates(initialStates());
    setEditorStatus("idle");
    setVerdict(undefined);
    setFatalError(null);
    setQuartile(q);
    setTab("decision");
    // Mark every reviewer as working up front, then update each independently.
    setStates(Object.fromEntries(PANEL.map((r) => [r.id, { status: "working" as CardStatus }])));
    setStatusMsg("The panel is reviewing — each reviewer runs on its own model…");
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    // Each reviewer is its own request, so it gets its own server budget and one
    // slow model can't starve the others. A small stagger avoids hammering the
    // shared NVIDIA endpoint with a burst of simultaneous calls.
    const collected: { reviewerId: string; review: ReviewResult }[] = [];

    async function callReviewer(reviewerId: string, delay: number) {
      if (delay) await new Promise((res) => setTimeout(res, delay));
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewerId, paperText, quartile: q }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.review) {
          collected.push({ reviewerId, review: data.review });
          setStates((s) => ({ ...s, [reviewerId]: { status: "done", review: data.review } }));
        } else {
          setStates((s) => ({
            ...s,
            [reviewerId]: { status: "error", error: data.error || `Failed (${res.status}).` },
          }));
        }
      } catch (e: any) {
        setStates((s) => ({
          ...s,
          [reviewerId]: { status: "error", error: e?.message || "Network error." },
        }));
      }
    }

    try {
      // Spread reviewer requests out (~1.2s apart) so we don't hit the shared
      // NVIDIA endpoint with a simultaneous burst, a common rate-limit trigger.
      await Promise.all(PANEL.map((r, i) => callReviewer(r.id, i * 1200)));

      if (collected.length === 0) {
        setFatalError(
          "No reviewer was able to respond. The NVIDIA endpoint may be rate-limited or down — please try again in a moment."
        );
        return;
      }

      // Editorial synthesis on whatever came back.
      setEditorStatus("working");
      setStatusMsg("All available reviews are in. The handling editor is deliberating…");
      try {
        const res = await fetch("/api/decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quartile: q, reviews: collected }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.verdict) {
          setVerdict(data.verdict);
        } else {
          setFatalError(data.error || "The editor could not be reached.");
        }
      } catch (e: any) {
        setFatalError(e?.message || "The editor could not be reached.");
      } finally {
        setEditorStatus("done");
        setStatusMsg("");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <main id="top">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="chip mx-auto mb-6 animate-fadeUp">
            <IconSpark width={15} height={15} className="text-accent" /> Five distinct AI models · one editorial verdict
          </span>
          <h1 className="animate-fadeUp text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            A peer-review panel for <span className="text-accent">any</span> scientific paper.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fadeUp text-lg text-text-secondary">
            Digital twins of four independent reviewers read your manuscript, leave realistic,
            actionable comments, and a handling editor delivers the decision — calibrated to the
            journal quartile you&apos;re aiming for.
          </p>
          <div className="mt-8 flex animate-fadeUp items-center justify-center gap-3">
            <a href="#submit" className="btn-primary">
              Submit a manuscript <IconArrow width={18} height={18} />
            </a>
            <a href="#how" className="btn-outline">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <IconDoc width={22} height={22} />,
              t: "1 · Submit",
              d: "Upload a PDF (parsed in your browser) or paste the text, then pick the target quartile (Q1–Q4).",
            },
            {
              icon: <IconUser width={22} height={22} />,
              t: "2 · Four reviewers",
              d: "Four reviewer twins — each a different model with its own focus — read the paper in parallel.",
            },
            {
              icon: <IconGavel width={22} height={22} />,
              t: "3 · The decision",
              d: "A handling editor weighs the reviews against the quartile bar and issues Accept / Revise / Reject.",
            },
          ].map((s, i) => (
            <div key={i} className="card animate-fadeUp p-6">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-accent/15 text-accent">
                {s.icon}
              </span>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The panel */}
      <section id="panel" className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-2xl font-bold">Meet the panel</h2>
        <p className="mt-1.5 text-text-secondary">
          Every reviewer is powered by a different model, so the panel reasons from genuinely
          independent vantage points.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PANEL.map((r) => (
            <div key={r.id} className="card p-5">
              <span
                className="grid h-10 w-10 place-items-center rounded-md ring-1"
                style={{ background: `${r.hue}22`, color: r.hue, borderColor: `${r.hue}55` }}
              >
                <IconUser width={18} height={18} />
              </span>
              <h3 className="mt-3 font-semibold">{r.name}</h3>
              <p className="text-sm text-accent">{r.role}</p>
              <p className="mt-2 text-xs leading-relaxed text-text-tertiary">{r.blurb}</p>
              <span className="chip mt-3 !py-0.5 !text-xs font-mono">{r.modelLabel}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-md border border-subtle bg-elevated/60 p-4">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md ring-1"
            style={{ background: `${EDITOR.hue}22`, color: EDITOR.hue, borderColor: `${EDITOR.hue}55` }}
          >
            <IconGavel width={18} height={18} />
          </span>
          <div>
            <p className="font-semibold">
              {EDITOR.name} <span className="font-normal text-text-tertiary">· {EDITOR.role}</span>
            </p>
            <p className="text-sm text-text-secondary">
              A fifth model synthesises all four reviews into the final decision.{" "}
              <span className="font-mono text-xs text-text-tertiary">{EDITOR.modelLabel}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Submit */}
      <section id="submit" className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold">Submit your paper</h2>
        <UploadForm busy={running} onSubmit={startReview} />
      </section>

      {/* Results */}
      <section ref={resultsRef} className="mx-auto max-w-6xl scroll-mt-20 px-6">
        {started && (
          <div className="space-y-6">
            {statusMsg && (
              <p className="text-center text-sm text-text-secondary">{statusMsg}</p>
            )}

            {fatalError && (
              <div className="card border-rose-400/30 bg-rose-500/5 p-5 text-rose-300">
                {fatalError}
              </div>
            )}

            {/* Tabs */}
            <div className="inline-flex rounded-pill border border-subtle p-1 text-sm">
              {([
                { id: "decision", label: "Consolidated Decision" },
                { id: "reviews", label: "Detailed Reviews" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-pill px-4 py-1.5 transition-colors ${
                    tab === t.id
                      ? "bg-accent text-white"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "decision" ? (
              <ConsolidatedPanel
                panel={PANEL}
                states={states}
                editorStatus={editorStatus}
                verdict={verdict}
                quartile={quartile}
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {PANEL.map((r) => (
                  <ReviewerCard
                    key={r.id}
                    reviewer={r}
                    status={states[r.id]?.status ?? "pending"}
                    review={states[r.id]?.review}
                    errorMsg={states[r.id]?.error}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
