import type { CheckResult } from "@/lib/turkish/answer";

/** Page heading: English title with the Turkish word underneath (no middle-dot joins). */
export function PageTitle({ en, tr, children }: { en: string; tr: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl leading-none font-extrabold sm:text-[34px]">{en}</h1>
        <p className="mt-1 text-muted" lang="tr">
          {tr}
        </p>
      </div>
      {children}
    </div>
  );
}

/** Thick, rounded progress bar with a glossy highlight (Duolingo-style). */
export function ProgressBar({
  value,
  max = 1,
  className = "",
  tone = "kobalt",
  thin = false,
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "kobalt" | "turkuaz" | "cay" | "zeytin";
  thin?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const fill = { kobalt: "bg-kobalt", turkuaz: "bg-turkuaz", cay: "bg-cay", zeytin: "bg-zeytin" }[tone];
  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-locked ${thin ? "h-2.5" : "h-4"} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`relative h-full rounded-full ${fill} transition-[width] duration-500`} style={{ width: `${pct}%` }}>
        {pct > 6 && !thin ? <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/35" /> : null}
      </div>
    </div>
  );
}

export const RESULT_COPY: Record<CheckResult, { title: string; tr: string; sheet: string; text: string; btn: string }> = {
  correct: { title: "Correct", tr: "Doğru!", sheet: "bg-zeytin-tint", text: "text-zeytin-depth", btn: "btn-success" },
  almost: { title: "Almost there", tr: "Neredeyse!", sheet: "bg-cay-tint", text: "text-cay-depth", btn: "btn-cay" },
  wrong: { title: "Not quite", tr: "Yanlış", sheet: "bg-nar-tint", text: "text-nar-depth", btn: "btn-danger" },
};

/** Inline result note (used where a full feedback sheet would be too much). */
export function ResultBanner({ result, children }: { result: CheckResult; children?: React.ReactNode }) {
  const s = RESULT_COPY[result];
  return (
    <div className={`rounded-2xl px-4 py-3 ${s.sheet}`} role="status">
      <div className={`font-display text-lg font-extrabold ${s.text}`}>{s.tr}</div>
      {children ? <div className="mt-0.5 text-ink">{children}</div> : null}
    </div>
  );
}

export function Stat({ label, labelTr, value, hint, icon }: { label: string; labelTr?: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-line p-3">
      {icon ? <div className="shrink-0">{icon}</div> : null}
      <div className="min-w-0">
        <div className="font-display text-2xl leading-none font-extrabold">{value}</div>
        <div className="mt-1 truncate text-sm text-ink-soft">{label}</div>
        {hint ? <div className="truncate text-xs text-muted">{hint}</div> : labelTr ? <div className="truncate text-xs text-muted">{labelTr}</div> : null}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "sea" | "accent" }) {
  const map = {
    neutral: "bg-wash text-ink-soft",
    good: "bg-zeytin-tint text-zeytin-depth",
    warn: "bg-cay-tint text-cay-depth",
    bad: "bg-nar-tint text-nar-depth",
    sea: "bg-turkuaz-tint text-turkuaz-depth",
    accent: "bg-kobalt-tint text-kobalt",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

/** Bubble for a short instruction from Simit. */
export function SpeechBubble({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border-2 border-line bg-paper px-4 py-3 ${className}`}>
      {children}
      <span className="absolute top-6 -left-[9px] h-4 w-4 rotate-45 border-b-2 border-l-2 border-line bg-paper" aria-hidden="true" />
    </div>
  );
}
