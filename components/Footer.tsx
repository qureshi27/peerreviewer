export default function Footer() {
  return (
    <footer className="mt-24 border-t border-subtle">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-10 text-center">
        <p className="text-sm text-text-tertiary">
          Reviews are AI-generated for guidance and rehearsal. They do not replace a journal&apos;s
          formal peer review.
        </p>
        <p className="text-sm text-text-secondary">
          Powered by{" "}
          <span className="font-semibold text-text-primary">Albatross Technologies</span>
        </p>
        <p className="text-xs text-text-tertiary">
          Review models served via NVIDIA NIM · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
