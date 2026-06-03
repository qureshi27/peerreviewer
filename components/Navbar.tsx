import { IconGavel } from "./icons";

export default function Navbar() {
  return (
    <header className="glass-nav sticky top-0 z-50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/15 text-accent ring-1 ring-accent/30">
            <IconGavel width={18} height={18} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Peer<span className="text-accent">Reviewer</span>
          </span>
        </a>
        <div className="hidden items-center gap-8 text-sm text-text-secondary md:flex">
          <a href="#how" className="transition-colors hover:text-text-primary">
            How it works
          </a>
          <a href="#panel" className="transition-colors hover:text-text-primary">
            The Panel
          </a>
          <a href="#submit" className="transition-colors hover:text-text-primary">
            Submit
          </a>
        </div>
        <a href="#submit" className="btn-primary !px-5 !py-2 text-sm">
          Start a review
        </a>
      </nav>
    </header>
  );
}
