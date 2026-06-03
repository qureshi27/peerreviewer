"use client";

import { useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UploadForm from "@/components/UploadForm";
import ReviewerCard, { type CardStatus } from "@/components/ReviewerCard";
import DecisionBanner from "@/components/DecisionBanner";
import { IconArrow, IconDoc, IconGavel, IconSpark, IconUser } from "@/components/icons";
import { publicReviewers, EDITOR } from "@/lib/reviewers";
import type {
  EditorVerdict,
  PublicReviewer,
  Quartile,
  ReviewResult,
  StreamEvent,
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
  const resultsRef = useRef<HTMLDivElement>(null);

  async function startReview(paperText: string, q: Quartile) {
    setRunning(true);
    setStarted(true);
    setStates(initialStates());
    setEditorStatus("idle");
    setVerdict(undefined);
    setFatalError(null);
    setQuartile(q);
    setStatusMsg("Connecting to the review panel…");
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperText, quartile: q }),
      });

      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => ({ error: `Request failed (${res.status}).` }));
        setFatalError(msg.error || `Request failed (${res.status}).`);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: StreamEvent;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          handleEvent(evt);
        }
      }
    } catch (e: any) {
      setFatalError(e?.message ?? "The connection to the review panel was interrupted.");
    } finally {
      setRunning(false);
    }
  }

  function handleEvent(evt: StreamEvent) {
    switch (evt.type) {
      case "status":
        setStatusMsg(evt.message);
        break;
      case "reviewer_start":
        setStates((s) => ({ ...s, [evt.reviewer.id]: { status: "working" } }));
        break;
      case "reviewer_done":
        setStates((s) => ({ ...s, [evt.reviewerId]: { status: "done", review: evt.review } }));
        break;
      case "reviewer_error":
        setStates((s) => ({ ...s, [evt.reviewerId]: { status: "error", error: evt.message } }));
        break;
      case "editor_start":
        setStatusMsg("All reviews are in. The editor is deliberating…");
        setEditorStatus("working");
        break;
      case "editor_done":
        setVerdict(evt.verdict);
        setEditorStatus("done");
        setStatusMsg("");
        break;
      case "error":
        setFatalError(evt.message);
        break;
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

            <div>
              <h2 className="mb-4 text-2xl font-bold">Reviews</h2>
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
            </div>

            {editorStatus !== "idle" && (
              <div>
                <h2 className="mb-4 text-2xl font-bold">Decision</h2>
                <DecisionBanner status={editorStatus} verdict={verdict} quartile={quartile} />
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
