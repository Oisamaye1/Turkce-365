import type { WeeklyReport } from "@/lib/lesson/weekly";
import { IconFlame } from "../icons";
import { ProgressBar } from "../ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function ReportView({ report }: { report: WeeklyReport }) {
  const tiles = [
    { label: "words in total", value: report.wordsTotal, cls: "border-kobalt text-kobalt" },
    { label: "new this week", value: `+${report.wordsThisWeek}`, cls: "border-turkuaz text-turkuaz-depth" },
    { label: `recall, ${report.reviewsThisWeek} reviews`, value: report.reviewsThisWeek ? pct(report.retention) : "—", cls: "border-zeytin text-zeytin-depth" },
    { label: `day streak, best ${report.streak.best}`, value: report.streak.current, cls: "border-cay text-cay-depth", flame: true },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-2xl border-2 p-3 ${t.cls}`}>
            <div className="font-display flex items-center gap-1 text-3xl font-extrabold">
              {t.flame ? <IconFlame size={26} /> : null}
              {t.value}
            </div>
            <div className="text-sm text-ink-soft">{t.label}</div>
          </div>
        ))}
      </div>

      {report.quiz ? (
        <div className="card">
          <h3 className="font-display text-lg font-extrabold">Sunday quiz</h3>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-sm text-muted">Words</dt>
              <dd className="font-display text-2xl font-extrabold">
                {report.quiz.vocab.correct}/{report.quiz.vocab.total}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Suffixes</dt>
              <dd className="font-display text-2xl font-extrabold">
                {report.quiz.drills.correct}/{report.quiz.drills.total}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Translation</dt>
              <dd className="font-display text-2xl font-extrabold capitalize">{report.quiz.translation.result}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="card">
        <h3 className="font-display text-lg font-extrabold">Suffix accuracy by rule</h3>
        {report.suffixAccuracy.length ? (
          <div className="mt-3 space-y-3">
            {report.suffixAccuracy.map((s) => (
              <div key={s.stepId}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="truncate">
                    {s.stepId}. {s.title}
                  </span>
                  <span className="shrink-0 text-muted">
                    {pct(s.accuracy)} of {s.attempts}
                  </span>
                </div>
                <ProgressBar value={s.accuracy} thin tone={s.accuracy >= 0.9 ? "zeytin" : s.accuracy >= 0.7 ? "cay" : "kobalt"} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No suffix drills this week.</p>
        )}
      </div>

      <div className="card">
        <h3 className="font-display text-lg font-extrabold">Mistakes that keep coming back</h3>
        {report.topMistakes.length ? (
          <ol className="mt-2 space-y-2">
            {report.topMistakes.map((m, i) => (
              <li key={m.label} className="flex items-center gap-3">
                <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-nar-tint font-extrabold text-nar-depth">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <b>{m.label}</b> <span className="text-sm text-muted">{m.kind === "word" ? "word" : "grammar rule"}</span>
                </span>
                <span className="text-sm text-muted">{m.count}×</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted">Nothing recurring this week — harika!</p>
        )}
      </div>

      <div className="rounded-3xl bg-banner p-5 text-white">
        <h3 className="font-display text-lg font-extrabold">Focus for next week</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          {report.focusAreas.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="mt-3 text-white/85">{report.encouragement}</p>
        <p className="mt-2 text-xs text-white/60">{report.narrativeSource === "claude" ? "Notes written by Claude" : "Notes written offline"}</p>
      </div>
    </div>
  );
}
