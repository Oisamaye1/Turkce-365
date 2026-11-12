import { ReportView } from "@/components/lesson/report-view";
import { ActivityChart, WordsChart } from "@/components/progress-charts";
import { BuildReportButton } from "@/components/build-report";
import { PageTitle, ProgressBar, Stat } from "@/components/ui";
import { getStepStatuses } from "@/lib/db/grammar";
import { getSettings } from "@/lib/db/settings";
import { dailyActivity, retention, streak, totals, wordsLearned } from "@/lib/db/stats";
import { GRAMMAR_STEPS } from "@/lib/grammar/steps";
import { listReports } from "@/lib/lesson/weekly";
import { addDays, startOfLocalDayIso } from "@/lib/time";

export default async function ProgressPage() {
  const { timezone } = await getSettings();
  const activity = await dailyActivity(28);
  const since = startOfLocalDayIso(activity[0].date, timezone);
  const before = await wordsLearned("", since);
  const t = await totals();
  const st = await streak();
  const ret = await retention(startOfLocalDayIso(addDays(activity[activity.length - 1].date, -6), timezone));
  const steps = await getStepStatuses();
  const reports = await listReports();

  return (
    <div className="space-y-5">
      <PageTitle en="Progress" tr="İlerleme">
        <BuildReportButton />
      </PageTitle>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Words met" labelTr="Kelimeler" value={t.introduced} hint={`${Math.round((t.introduced / 1500) * 100)}% of 1,500`} />
        <Stat label="Retention (7d)" labelTr="Hatırlama" value={ret.reviews ? `${Math.round(ret.rate * 100)}%` : "—"} hint={`${ret.reviews} reviews`} />
        <Stat label="Streak" labelTr="Seri" value={`🔥 ${st.current}`} hint={`best ${st.best}`} />
        <Stat label="Lessons done" labelTr="Dersler" value={t.lessonsDone} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">
            Daily activity, 28 days <span className="label-tr">· Günlük çalışma</span>
          </h2>
          <ActivityChart data={activity} />
        </section>
        <section className="card">
          <h2 className="font-semibold">
            Words met <span className="label-tr">· Öğrenilen kelimeler</span>
          </h2>
          <WordsChart data={activity} start={before} />
        </section>
      </div>
      <details className="card text-sm">
        <summary className="cursor-pointer font-semibold">Table view · Tablo</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3">Date</th>
                <th className="pr-3">Reviews</th>
                <th className="pr-3">Correct</th>
                <th className="pr-3">Drills</th>
                <th>New words</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="py-1 pr-3">{d.date}</td>
                  <td>{d.reviews}</td>
                  <td>{d.correct}</td>
                  <td>{d.drills}</td>
                  <td>{d.newWords}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <section className="card">
        <h2 className="mb-3 font-semibold">
          Suffix mastery (last 20 drills per step) <span className="label-tr">· Ek ustalığı</span>
        </h2>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {GRAMMAR_STEPS.map((s) => {
            const st2 = steps.find((x) => x.stepId === s.id)!;
            return (
              <div key={s.id} className={`text-sm ${st2.unlocked ? "" : "opacity-45"}`}>
                <div className="flex justify-between gap-2">
                  <span className="truncate">
                    {s.id}. {s.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{st2.unlocked ? `${Math.round(st2.mastery * 100)}% · ${st2.attempts} tries` : "🔒"}</span>
                </div>
                <ProgressBar value={st2.mastery} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">
          Weekly reports <span className="label-tr">· Haftalık raporlar</span>
        </h2>
        {reports.length ? (
          reports.map((r, i) =>
            i === 0 ? (
              <ReportView key={r.week} report={r} />
            ) : (
              <details key={r.week} className="card">
                <summary className="cursor-pointer">Week of {r.week}</summary>
                <div className="mt-3">
                  <ReportView report={r} />
                </div>
              </details>
            ),
          )
        ) : (
          <p className="card text-sm text-muted">Your first report appears after the Sunday check-in.</p>
        )}
      </section>
    </div>
  );
}
