import Link from "next/link";
import { IconX } from "./icons";
import { ProgressBar } from "./ui";

/** Full-screen exercise frame: close button, a slim progress line, one calm column. */
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
      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[720px] items-center gap-4 px-5 pt-5 pb-4">
          <Link href={exitHref} className="-ml-2 rounded-lg p-2 text-muted hover:bg-haze hover:text-ink" aria-label="Close and go back">
            <IconX size={20} />
          </Link>
          <ProgressBar value={progress} max={max} />
          {right ? <div className="shrink-0 text-[14px] text-muted tabular">{right}</div> : null}
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-5 pt-6 pb-12">{children}</main>
    </div>
  );
}

/** Bottom action bar for non-answer steps (intro cards, reading, finishing). */
export function FooterBar({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <>
      <div className="h-28" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[14px] text-muted">{note}</div>
          <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>
        </div>
      </div>
    </>
  );
}
