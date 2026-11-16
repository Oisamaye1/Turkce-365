import Link from "next/link";
import { IconCheck, IconLock } from "./icons";

export type StepState = "done" | "current" | "next" | "locked";

export interface SessionStep {
  key: string;
  title: string;
  titleTr: string;
  detail?: string;
  minutes?: number;
  href: string | null;
  state: StepState;
}

/** Today's session as a numbered stepper (it is a real sequence). */
export function SessionSteps({ steps }: { steps: SessionStep[] }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const marker =
          s.state === "done" ? (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ok text-white">
              <IconCheck size={16} />
            </span>
          ) : s.state === "current" ? (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[14px] font-semibold text-white ring-4 ring-accent-tint tabular">{i + 1}</span>
          ) : s.state === "locked" ? (
            <span className="grid h-8 w-8 place-items-center rounded-full border border-line-strong bg-paper text-muted">
              <IconLock size={14} />
            </span>
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full border border-line-strong bg-paper text-[14px] text-ink-soft tabular">{i + 1}</span>
          );
        const body = (
          <div className={`flex min-w-0 flex-1 items-center gap-4 py-4 ${last ? "" : "border-b border-line"}`}>
            <div className="min-w-0 flex-1">
              <p className={`font-display text-[19px] leading-snug font-semibold ${s.state === "locked" ? "text-muted" : "text-ink"}`}>{s.title}</p>
              <p className="truncate text-[14px] text-muted">
                <span lang="tr">{s.titleTr}</span>
                {s.detail ? `, ${s.detail}` : ""}
                {s.minutes ? `, ${s.minutes} min` : ""}
              </p>
            </div>
            {s.state === "current" && s.href ? (
              <span className="btn-primary pointer-events-none">{s.key === "reviews" ? "Start" : "Continue"}</span>
            ) : s.state === "done" ? (
              <span className="text-[14px] text-ok-text">Done</span>
            ) : null}
          </div>
        );
        return (
          <li key={s.key} className="relative flex gap-4">
            <div className="relative flex w-8 shrink-0 justify-center pt-4">
              {!last ? <span className="absolute top-12 bottom-[-16px] w-px bg-line-strong" aria-hidden="true" /> : null}
              {marker}
            </div>
            {s.href && s.state !== "locked" ? (
              <Link href={s.href} className="flex min-w-0 flex-1 rounded-lg focus-visible:outline-offset-4" aria-label={`${s.title}${s.state === "done" ? " (done)" : ""}`}>
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
