import type { CheckResult } from "@/lib/turkish/answer";

export function PageTitle({ en, tr, children }: { en: string; tr: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-2xl font-bold sm:text-3xl">
        {en} <span className="label-tr">· {tr}</span>
      </h1>
      {children}
    </div>
  );
}

export function ProgressBar({ value, max = 1, className = "" }: { value: number; max?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-card-2 ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-sea transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

const RESULT_STYLE: Record<CheckResult, { cls: string; en: string; tr: string; icon: string }> = {
  correct: { cls: "border-good bg-good-soft text-good", en: "Correct", tr: "Doğru", icon: "✓" },
  almost: { cls: "border-warn bg-warn-soft text-warn", en: "Almost", tr: "Neredeyse", icon: "≈" },
  wrong: { cls: "border-bad bg-bad-soft text-bad", en: "Not quite", tr: "Yanlış", icon: "✗" },
};

export function ResultBanner({ result, children }: { result: CheckResult; children?: React.ReactNode }) {
  const s = RESULT_STYLE[result];
  return (
    <div className={`rounded-xl border px-4 py-3 ${s.cls}`} role="status">
      <div className="font-semibold">
        {s.icon} {s.en} <span className="font-normal opacity-80">· {s.tr}</span>
      </div>
      {children ? <div className="mt-1 text-fg">{children}</div> : null}
    </div>
  );
}

export function Stat({ label, labelTr, value, hint }: { label: string; labelTr: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted">
        {label} · {labelTr}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "sea" | "accent" }) {
  const map = {
    neutral: "bg-card-2 text-muted",
    good: "bg-good-soft text-good",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    sea: "bg-sea-soft text-sea",
    accent: "bg-accent-soft text-accent",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}
