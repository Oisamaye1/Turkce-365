import Link from "next/link";
import { BuildReportButton } from "@/components/build-report";
import { IconFlame } from "@/components/icons";
import { ReportView } from "@/components/lesson/report-view";
import { MoreTabs } from "@/components/nav";
import { ActivityChart, WordsChart } from "@/components/progress-charts";
import { PageTitle, ProgressBar } from "@/components/ui";
import { getStepStatuses } from "@/lib/db/grammar";
import { listLessons } from "@/lib/db/lessons";
import { getSettings } from "@/lib/db/settings";
import { dailyActivity, retention, streak, totals, wordsLearned } from "@/lib/db/stats";
import { GRAMMAR_STEPS } from "@/lib/grammar/steps";
import { listReports } from "@/lib/lesson/weekly";
import { addDays, startOfLocalDayIso } from "@/lib/time";

export default async function ProgressPage() {
  const { timezone } = await getSettings();
  const activity = await dailyActivity(28);
  const since = startOfLocalDayIso(activity[0].date, timezone);
  const [before, t, st, ret, steps, reports, lessons] = await Promise.all([
    wordsLearned("", since),
    totals(),
    streak(),
    retention(startOfLocalDayIso(addDays(activity[activity.length - 1].date, -6), timezone)),
    getStepStatuses(),
    listReports(),
    listLessons(14),
  ]);

  const tiles = [
    { label: "words met", hint: `${Math.round((t.introduced / 1500) * 100)}% of the 1,500`, value: t.introduced, cls: "border-kobalt text-kobalt" },
    { label: "recall this week", hint: `${ret.reviews} reviews`, value: ret.reviews ? `${Math.round(ret.rate * 100)}%` : "—", cls: "border-zeytin text-zeytin-depth" },
    { label: "day streak", hint: `best ${st.best}`, value: st.current, cls: "border-cay text-cay-depth", flame: true },
    { label: "lessons done", hint: `${t.mature} words well learned`, value: t.lessonsDone, cls: "border-turkuaz text-turkuaz-depth" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <MoreTabs />
        <PageTitle en="Progress" tr="İlerleme">
          <BuildReportButton />
        </PageTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((x) => (
            <div key={x.label} className={`rounded-3xl border-2 p-4 ${x.cls}`}>
              <div className="font-display flex items-center gap-1 text-4xl font-extrabold">
                {x.flame ? <IconFlame size={32} lit={st.current > 0} /> : null}
                {x.value}
              </div>
              <div className="font-medium text-ink">{x.label}</div>
              <div className="text-sm text-muted">{x.hint}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-display text-xl font-extrabold">Practice over the last four weeks</h2>
          <p className="text-sm text-muted">Reviews and suffix drills per day</p>
          <ActivityChart data={activity} />
        </section>
        <section className="card">
          <h2 className="font-display text-xl font-extrabold">Words you&apos;ve met</h2>
          <p className="text-sm text-muted">Running total over the same four weeks</p>
          <WordsChart data={activity} start={before} />
        </section>
      </div>
      <details className="-mt-6 text-sm">
        <summary className="btn-quiet inline-flex cursor-pointer !px-0">Show the numbers as a table</summary>
        <div className="mt-2 overflow-x-auto rounded-2xl border-2 border-line">
          <table className="w-full text-left">
            <thead className="bg-wash text-muted">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3">Reviews</th>
                <th className="px-3">Correct</th>
                <th className="px-3">Drills</th>
                <th className="px-3">New words</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((d) => (
                <tr key={d.date} className="border-t-2 border-line">
                  <td className="px-3 py-1.5">{d.date}</td>
                  <td className="px-3">{d.reviews}</td>
                  <td className="px-3">{d.correct}</td>
                  <td className="px-3">{d.drills}</td>
                  <td className="px-3">{d.newWords}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <section>
        <h2 className="font-display text-2xl font-extrabold">Suffix mastery</h2>
        <p className="mb-4 text-muted">Accuracy over your last 20 drills in each grammar step.</p>
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {GRAMMAR_STEPS.map((s) => {
            const x = steps.find((y) => y.stepId === s.id)!;
            return (
              <Link key={s.id} href={x.unlocked ? `/gym?step=${s.id}` : "/gym"} className={`block rounded-2xl px-2 py-1.5 hover:bg-wash ${x.unlocked ? "" : "opacity-50"}`}>
                <div className="mb-1 flex justify-between gap-2">
                  <span className="truncate font-medium">
                    {s.id}. {s.title}
                  </span>
                  <span className="shrink-0 text-sm text-muted">{x.unlocked ? `${Math.round(x.mastery * 100)}%` : "locked"}</span>
                </div>
                <ProgressBar value={x.mastery} thin tone={x.mastered ? "zeytin" : "kobalt"} />
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display mb-4 text-2xl font-extrabold">Weekly reports</h2>
        {reports.length ? (
          <div className="space-y-4">
            <ReportView report={reports[0]} />
            {reports.slice(1).map((r) => (
              <details key={r.week} className="rounded-2xl border-2 border-line">
                <summary className="font-display cursor-pointer px-4 py-3 text-lg font-bold">Week of {r.week}</summary>
                <div className="p-4">
                  <ReportView report={r} />
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-muted">Your first report appears after the Sunday check-in.</p>
        )}
      </section>

      {lessons.length ? (
        <section>
          <h2 className="font-display mb-3 text-2xl font-extrabold">Past lessons</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {lessons.map((l) => (
              <li key={l.date}>
                <Link href={`/lesson?date=${l.date}`} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-line px-4 py-3 hover:bg-wash">
                  <span className="min-w-0">
                    <span className="font-display block truncate font-bold">{"title" in l.lesson ? l.lesson.title : ""}</span>
                    <span className="block text-xs text-muted">{l.date}</span>
                  </span>
                  {l.completedAt ? <span className="rounded-full bg-zeytin-tint px-2.5 py-0.5 text-xs font-semibold text-zeytin-depth">Done</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
