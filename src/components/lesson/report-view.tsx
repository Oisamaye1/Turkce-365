import type { WeeklyReport } from "@/lib/lesson/weekly";
import { Badge, ProgressBar, Stat } from "../ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function ReportView({ report }: { report: WeeklyReport }) {
  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">
          Week of {report.week} <span className="label-tr">· Haftalık rapor</span>
        </h2>
        <Badge tone={report.narrativeSource === "claude" ? "sea" : "neutral"}>{report.narrativeSource === "claude" ? "✨ Notes by Claude" : "📦 Local notes"}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Words total" labelTr="Toplam" value={report.wordsTotal} />
        <Stat label="This week" labelTr="Bu hafta" value={`+${report.wordsThisWeek}`} />
        <Stat label="Retention" labelTr="Hatırlama" value={report.reviewsThisWeek ? pct(report.retention) : "—"} hint={`${report.reviewsThisWeek} reviews`} />
        <Stat label="Streak" labelTr="Seri" value={`🔥 ${report.streak.current}`} hint={`best ${report.streak.best}`} />
      </div>

      {report.quiz ? (
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-card-2 p-3">
            Quiz words: <b>{report.quiz.vocab.correct}/{report.quiz.vocab.total}</b>
          </div>
          <div className="rounded-xl bg-card-2 p-3">
            Quiz drills: <b>{report.quiz.drills.correct}/{report.quiz.drills.total}</b>
          </div>
          <div className="rounded-xl bg-card-2 p-3">
            Translation: <b>{report.quiz.translation.result}</b>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 font-semibold">
          Suffix accuracy per rule <span className="label-tr">· Kurallara göre doğruluk</span>
        </h3>
        {report.suffixAccuracy.length ? (
          <div className="space-y-2">
            {report.suffixAccuracy.map((s) => (
              <div key={s.stepId} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
                <span className="truncate">
                  {s.stepId}. {s.title}
                </span>
                <span className="text-xs text-muted">
                  {pct(s.accuracy)} · {s.attempts}
                </span>
                <ProgressBar value={s.accuracy} className="col-span-2" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No suffix drills this week.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-semibold">
          Top recurring mistakes <span className="label-tr">· En sık hatalar</span>
        </h3>
        {report.topMistakes.length ? (
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {report.topMistakes.map((m) => (
              <li key={m.label}>
                <b>{m.label}</b> <span className="text-muted">× {m.count}</span> {m.kind === "word" ? <Badge>word</Badge> : <Badge tone="sea">rule</Badge>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">No recurring mistakes — harika!</p>
        )}
      </div>

      <div className="rounded-xl border border-sea bg-sea-soft p-3">
        <h3 className="mb-1 font-semibold">
          Focus next week <span className="label-tr">· Gelecek hafta</span>
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {report.focusAreas.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm italic">{report.encouragement}</p>
      </div>
    </div>
  );
}
