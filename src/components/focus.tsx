import Link from "next/link";
import { IconX } from "./icons";
import { ProgressBar } from "./ui";

/** Full-screen exercise frame: ✕ to leave, a thick progress bar, centred content. */
export function FocusShell({
  progress,
  max,
  right,
  children,
  exitHref = "/",
}: {
  progress: number;
  max: number;
  right?: React.ReactNode;
  children: React.ReactNode;
  exitHref?: string;
}) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 pt-5 pb-3 sm:px-6">
          <Link href={exitHref} className="rounded-xl p-1 text-muted hover:bg-wash hover:text-ink" aria-label="Leave and go back">
            <IconX size={28} />
          </Link>
          <ProgressBar value={progress} max={max} tone="zeytin" />
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-10 sm:px-6">{children}</main>
    </div>
  );
}

/** Bottom bar for non-answer steps (intro cards, reading, finishing). */
export function FooterBar({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <>
      <div className="h-32" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm text-muted">{note}</div>
          <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>
        </div>
      </div>
    </>
  );
}
