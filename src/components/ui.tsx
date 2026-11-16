import type { CheckResult } from "@/lib/turkish/answer";

/** Page heading: the English title, with the Turkish name beside it. */
export function PageTitle({ en, tr, lede, children }: { en: string; tr: string; lede?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[60ch]">
        <h1 className="font-display text-[33px] leading-tight font-semibold sm:text-[42px]">
          {en}
          <span className="ml-3 align-middle text-[17px] font-normal text-muted" lang="tr">
            {tr}
          </span>
        </h1>
        {lede ? <p className="mt-2 text-[17px] text-ink-soft">{lede}</p> : null}
      </div>
      {children}
    </header>
  );
}

/** Slim progress line. */
export function ProgressBar({
  value,
  max = 1,
  className = "",
  tone = "accent",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "accent" | "brand" | "ok";
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const fill = { accent: "bg-accent", brand: "bg-brand", ok: "bg-ok" }[tone];
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${fill} transition-[width] duration-500 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const RESULT_COPY: Record<CheckResult, { title: string; tr: string; tint: string; text: string; dot: string; btn: string }> = {
  correct: { title: "Correct", tr: "Doğru", tint: "bg-ok-tint", text: "text-ok-text", dot: "bg-ok", btn: "btn-ok" },
  almost: { title: "Almost", tr: "Neredeyse", tint: "bg-warn-tint", text: "text-warn-text", dot: "bg-warn", btn: "btn-warn" },
  wrong: { title: "Not quite", tr: "Yanlış", tint: "bg-bad-tint", text: "text-bad-text", dot: "bg-bad", btn: "btn-bad" },
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "brand" | "accent" }) {
  const map = {
    neutral: "bg-haze text-ink-soft",
    ok: "bg-ok-tint text-ok-text",
    warn: "bg-warn-tint text-warn-text",
    bad: "bg-bad-tint text-bad-text",
    brand: "bg-brand-tint text-brand-text",
    accent: "bg-accent-tint text-accent-text",
  };
  return <span className={`pill ${map[tone]}`}>{children}</span>;
}

/** A large prompt line used in exercises (replaces mascot speech bubbles). */
export function Prompt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-8">
      <p className="text-[15px] text-muted">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
