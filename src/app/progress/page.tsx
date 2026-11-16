import Link from "next/link";
import { CountUp } from "@/components/count-up";
import { STEP_ORDER } from "@/lib/plan/build";
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

  const figures = [
    { label: "words met", hint: `${Math.round((t.introduced / 1500) * 100)}% of the 1,500`, value: t.introduced },
    { label: "recall this week", hint: `over ${ret.reviews} reviews`, value: ret.reviews ? `${Math.round(ret.rate * 100)}%` : "–" },
    { label: "day streak", hint: `best ${st.best}`, value: st.current },
    { label: "lessons done", hint: `${t.mature} words well learned`, value: t.lessonsDone },
  ];

  return (
    <div className="space-y-16">
      <div>
        <MoreTabs />
        <PageTitle en="Progress" tr="İlerleme">
          <BuildReportButton />
        </PageTitle>
        <dl className="stagger grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-6 lg:grid-cols-4">
          {figures.map((x, i) => (
            <div key={x.label} style={{ "--i": i } as React.CSSProperties}>
              <dd className="font-display flex items-center gap-2 text-[48px] leading-none font-semibold tabular">
                {x.label === "day streak" ? <IconFlame size={30} className={st.current ? "text-accent" : "text-muted"} /> : null}
                {typeof x.value === "number" ? <CountUp value={x.value} /> : x.value}
              </dd>
              <dt className="mt-2 text-[15px]">{x.label}</dt>
              <p className="text-[14px] text-muted">{x.hint}</p>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-[21px] font-semibold">Practice over four weeks</h2>
          <p className="text-[14px] text-muted">Reviews and suffix drills per day</p>
          <ActivityChart data={activity} />
        </section>
        <section>
          <h2 className="font-display text-[21px] font-semibold">Words you&apos;ve met</h2>
          <p className="text-[14px] text-muted">Running total over the same four weeks</p>
          <WordsChart data={activity} start={before} />
        </section>
      </div>
      <details className="-mt-10 text-[14px]">
        <summary className="btn-quiet -ml-2 cursor-pointer">Show the numbers as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-normal">Date</th>
                <th className="pr-4 font-normal">Reviews</th>
                <th className="pr-4 font-normal">Correct</th>
                <th className="pr-4 font-normal">Drills</th>
                <th className="font-normal">New words</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((d) => (
                <tr key={d.date} className="border-b border-line">
                  <td className="py-1.5 pr-4">{d.date}</td>
                  <td className="pr-4">{d.reviews}</td>
                  <td className="pr-4">{d.correct}</td>
                  <td className="pr-4">{d.drills}</td>
                  <td>{d.newWords}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <section>
        <h2 className="font-display text-[26px] font-semibold">Suffix mastery</h2>
        <p className="mb-6 text-ink-soft">Accuracy over your last 20 drills in each grammar step.</p>
        <div className="grid gap-x-10 sm:grid-cols-2">
          {STEP_ORDER.map((id, pos) => {
            const s = GRAMMAR_STEPS.find((g) => g.id === id)!;
            const x = steps.find((y) => y.stepId === s.id)!;
            return (
              <Link
                key={s.id}
                href={x.unlocked ? `/gym?step=${s.id}` : "/gym"}
                className={`block border-b border-line py-3 hover:bg-haze ${x.unlocked ? "" : "opacity-50"}`}
              >
                <div className="mb-2 flex justify-between gap-3 text-[15px]">
                  <span className="truncate">
                    <span className="mr-2 text-muted tabular">{pos + 1}</span>
                    {s.title}
                  </span>
                  <span className="shrink-0 text-[14px] text-muted tabular">{x.unlocked ? `${Math.round(x.mastery * 100)}%` : "locked"}</span>
                </div>
                <ProgressBar value={x.mastery} tone={x.mastered ? "ok" : "brand"} />
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display mb-6 text-[26px] font-semibold">Weekly reports</h2>
        {reports.length ? (
          <div className="space-y-6">
            <ReportView report={reports[0]} />
            {reports.slice(1).map((r) => (
              <details key={r.week} className="border-t border-line">
                <summary className="cursor-pointer py-3 text-[15px]">Week of {r.week}</summary>
                <div className="pb-6">
                  <ReportView report={r} />
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-ink-soft">Your first report appears after the Sunday check-in.</p>
        )}
      </section>

      {lessons.length ? (
        <section>
          <h2 className="font-display mb-4 text-[26px] font-semibold">Past lessons</h2>
          <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-10">
            {lessons.map((l) => (
              <li key={l.date}>
                <Link href={`/lesson?date=${l.date}`} className="flex items-center justify-between gap-3 border-b border-line py-3 hover:bg-haze">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px]">{"title" in l.lesson ? l.lesson.title : ""}</span>
                    <span className="block text-[13px] text-muted tabular">{l.date}</span>
                  </span>
                  {l.completedAt ? <span className="pill bg-ok-tint text-ok-text">Done</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
