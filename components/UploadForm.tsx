"use client";

import { useRef, useState } from "react";
import type { Quartile } from "@/lib/types";
import { extractPdfText } from "@/lib/pdf";
import { IconDoc, IconUpload, Spinner } from "./icons";

const QUARTILES: { id: Quartile; label: string; desc: string }[] = [
  { id: "Q1", label: "Q1", desc: "Top-tier · novelty + rigor + impact" },
  { id: "Q2", label: "Q2", desc: "Strong · solid, useful advance" },
  { id: "Q3", label: "Q3", desc: "Respectable · correct & honest" },
  { id: "Q4", label: "Q4", desc: "Entry-level · sound & complete" },
];

export default function UploadForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (paperText: string, quartile: Quartile) => void;
}) {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState("");
  const [paperText, setPaperText] = useState("");
  const [pasted, setPasted] = useState("");
  const [quartile, setQuartile] = useState<Quartile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const text = mode === "file" ? paperText : pasted;
  const chars = text.trim().length;
  const ready = chars >= 300 && !!quartile && !busy && !extracting;

  async function handleFile(file: File) {
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file, or switch to “Paste text”.");
      return;
    }
    setFileName(file.name);
    setExtracting(true);
    setProgress("Opening PDF…");
    try {
      const extracted = await extractPdfText(file, (p, t) =>
        setProgress(`Extracting text — page ${p} of ${t}`)
      );
      if (extracted.trim().length < 300) {
        setError(
          "Could not extract enough text from this PDF (it may be scanned images). Try the “Paste text” option."
        );
        setPaperText("");
      } else {
        setPaperText(extracted);
        setProgress(`Extracted ${extracted.length.toLocaleString()} characters from ${file.name}`);
      }
    } catch (e: any) {
      setError(`Failed to read PDF: ${e?.message ?? "unknown error"}. Try pasting the text instead.`);
      setPaperText("");
    } finally {
      setExtracting(false);
    }
  }

  function submit() {
    setError(null);
    if (chars < 300) {
      setError("Please provide the manuscript text (at least ~300 characters).");
      return;
    }
    if (!quartile) {
      setError("Select the target journal quartile.");
      return;
    }
    onSubmit(text.trim(), quartile);
  }

  return (
    <div className="card p-6 sm:p-8">
      {/* Step 1 — manuscript */}
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-pill bg-accent/15 text-xs font-bold text-accent">
          1
        </span>
        <h3 className="font-semibold">Your manuscript</h3>
      </div>

      {/* mode toggle */}
      <div className="mb-4 inline-flex rounded-pill border border-subtle p-1 text-sm">
        {(["file", "paste"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-pill px-4 py-1.5 transition-colors ${
              mode === m ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {m === "file" ? "Upload PDF" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-accent bg-accent/5" : "border-white/15 hover:border-white/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {extracting ? (
            <Spinner width={26} height={26} className="text-accent" />
          ) : fileName ? (
            <IconDoc width={26} height={26} className="text-accent" />
          ) : (
            <IconUpload width={26} height={26} className="text-text-tertiary" />
          )}
          <div>
            <p className="font-medium">
              {fileName ?? "Drop a PDF here or click to browse"}
            </p>
            <p className="mt-1 text-sm text-text-tertiary">
              {extracting ? progress : progress || "We extract the text in your browser — the file never leaves your device."}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste the full manuscript text — title, abstract, methods, results, discussion…"
            rows={10}
            className="w-full resize-y rounded-md border border-subtle bg-base/60 p-4 text-sm leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent/60"
          />
        </div>
      )}

      <p className="mt-2 text-right text-xs text-text-tertiary">
        {chars.toLocaleString()} characters{chars > 0 && chars < 300 ? " — need at least 300" : ""}
      </p>

      {/* Step 2 — quartile */}
      <div className="mb-3 mt-6 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-pill bg-accent/15 text-xs font-bold text-accent">
          2
        </span>
        <h3 className="font-semibold">Target journal quartile</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUARTILES.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setQuartile(q.id)}
            className={`rounded-md border p-3 text-left transition-all ${
              quartile === q.id
                ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                : "border-subtle hover:border-white/25"
            }`}
          >
            <div className="font-mono text-lg font-bold">{q.label}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-text-tertiary">{q.desc}</div>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-rose-500/10 p-3 text-sm text-rose-300 ring-1 ring-rose-400/20">
          {error}
        </p>
      )}

      <button onClick={submit} disabled={!ready} className="btn-primary mt-6 w-full">
        {busy ? (
          <>
            <Spinner width={18} height={18} /> Review in progress…
          </>
        ) : (
          "Convene the review panel"
        )}
      </button>
      <p className="mt-3 text-center text-xs text-text-tertiary">
        Four independent reviewer models + a handling editor · ~30–60 seconds
      </p>
    </div>
  );
}
