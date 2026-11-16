import type { WeeklyReport } from "@/lib/lesson/weekly";
import { ProgressBar } from "../ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function ReportView({ report }: { report: WeeklyReport }) {
  const figures = [
    { label: "words in total", value: report.wordsTotal },
    { label: "new this week", value: `+${report.wordsThisWeek}` },
    { label: `recall over ${report.reviewsThisWeek} reviews`, value: report.reviewsThisWeek ? pct(report.retention) : "–" },
    { label: `day streak, best ${report.streak.best}`, value: report.streak.current },
  ];
  return (
    <div className="space-y-12">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-6 sm:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label}>
            <dd className="font-display text-[42px] leading-none font-semibold tabular">{f.value}</dd>
            <dt className="mt-2 text-[14px] text-muted">{f.label}</dt>
          </div>
        ))}
      </dl>

      {report.quiz ? (
        <section>
          <h3 className="font-display text-[21px] font-semibold">Sunday quiz</h3>
          <p className="mt-2 text-ink-soft tabular">
            Words {report.quiz.vocab.correct} of {report.quiz.vocab.total}, suffixes {report.quiz.drills.correct} of {report.quiz.drills.total}, translation{" "}
            {report.quiz.translation.result}.
          </p>
        </section>
      ) : null}

      <section>
        <h3 className="font-display text-[21px] font-semibold">Suffix accuracy by grammar step</h3>
        {report.suffixAccuracy.length ? (
          <div className="mt-4 space-y-4">
            {report.suffixAccuracy.map((s) => (
              <div key={s.stepId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
                <span className="truncate">
                  {s.stepId}. {s.title}
                </span>
                <span className="text-[14px] text-muted tabular">
                  {pct(s.accuracy)} of {s.attempts}
                </span>
                <ProgressBar value={s.accuracy} tone={s.accuracy >= 0.9 ? "ok" : "brand"} className="col-span-2" />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-muted">No suffix drills this week.</p>
        )}
      </section>

      <section>
        <h3 className="font-display text-[21px] font-semibold">Mistakes that keep coming back</h3>
        {report.topMistakes.length ? (
          <ol className="mt-3 divide-y divide-line border-y border-line">
            {report.topMistakes.map((m, i) => (
              <li key={m.label} className="flex items-baseline gap-4 py-3">
                <span className="text-[14px] text-muted tabular">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{m.label}</span> <span className="text-[14px] text-muted">{m.kind === "word" ? "word" : "grammar rule"}</span>
                </span>
                <span className="text-[14px] text-muted tabular">{m.count}×</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-muted">Nothing recurring this week.</p>
        )}
      </section>

      <section className="border-l-2 border-accent pl-5">
        <h3 className="font-display text-[21px] font-semibold">Focus for next week</h3>
        <ul className="mt-3 max-w-[62ch] list-disc space-y-2 pl-5">
          {report.focusAreas.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="mt-4 text-ink-soft">{report.encouragement}</p>
        <p className="mt-2 text-[13px] text-muted">{report.narrativeSource === "claude" ? "Notes written by Claude" : "Notes written offline"}</p>
      </section>
    </div>
  );
}
