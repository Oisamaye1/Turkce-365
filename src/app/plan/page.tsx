import Link from "next/link";
import { IconArrow, IconCheck } from "@/components/icons";
import { PlanBuilder } from "@/components/plan/plan-builder";
import { CountUp } from "@/components/count-up";
import { ProgressBar } from "@/components/ui";
import { currentPlanDay, getPlan, getPlanRows } from "@/lib/db/plan";
import { today } from "@/lib/db/settings";
import { DAY_KIND_LABEL, PLAN_DAYS, START_POINTS, firstDayOfStage, firstDayOfWeek, planDay, stepsIntroducedBy, wordsThrough } from "@/lib/plan/build";
import { STAGES, WEEKS } from "@/lib/plan/curriculum";

export const metadata = { title: "Plan · Türkçe 365" };

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ rebuild?: string }> }) {
  const sp = await searchParams;
  const [plan, date] = await Promise.all([getPlan(), today()]);

  if (!plan || sp.rebuild) {
    return (
      <PlanBuilder
        rebuilding={!!plan}
        today={date}
        totalDays={PLAN_DAYS}
        starts={START_POINTS.map((s) => ({ id: s.id, title: s.title, detail: s.detail, day: s.day }))}
        stages={STAGES.map((s) => ({
          id: s.id,
          title: s.title,
          titleTr: s.titleTr,
          level: s.level,
          outcome: s.outcome,
          firstDay: firstDayOfStage(s.id),
          lastDay: s.id === STAGES.length ? PLAN_DAYS : firstDayOfStage(s.id + 1) - 1,
        }))}
      />
    );
  }

  const [current, rows] = await Promise.all([currentPlanDay(plan), getPlanRows()]);
  const cur = Math.min(current ?? plan.startDay, PLAN_DAYS);
  const finishedAll = (current ?? 0) > PLAN_DAYS;
  const doneDays = [...rows.values()].filter((r) => r.completedAt).length;
  const span = PLAN_DAYS - plan.startDay + 1;
  const curDay = planDay(cur);
  const remaining = PLAN_DAYS - cur + 1;
  const finishEstimate = addDays(date, Math.ceil((remaining / plan.daysPerWeek) * 7));
  const isDone = (d: number) => d < plan.startDay || !!rows.get(d)?.completedAt;

  return (
    <div>
      {/* Header */}
      <section className="mb-12">
        <p className="text-[15px] text-muted">
          Your plan, stage {curDay.stage.id} of 6: {curDay.stage.title}
        </p>
        <h1 className="display-xl mt-2 text-[56px] sm:text-[80px]">
          {finishedAll ? (
            "Bitti!"
          ) : (
            <>
              Day <CountUp value={cur} />
              <span className="text-muted"> / 365</span>
            </>
          )}
        </h1>
        <div className="mt-6 flex max-w-xl items-center gap-3">
          <ProgressBar value={doneDays} max={span} tone="accent" />
          <span className="shrink-0 text-[14px] text-muted tabular">{Math.round((doneDays / span) * 100)}%</span>
        </div>
        <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          {[
            { k: "days finished", v: doneDays },
            { k: "words in the plan so far", v: wordsThrough(cur) },
            { k: "suffix steps open", v: stepsIntroducedBy(cur).length, suffix: " / 16" },
            { k: "estimated finish", text: finishEstimate },
          ].map((x) => (
            <div key={x.k}>
              <dt className="sr-only">{x.k}</dt>
              <dd className="font-display text-[28px] leading-none font-semibold tabular">
                {"text" in x ? <span className="text-[21px]">{x.text}</span> : <CountUp value={x.v!} />}
                {"suffix" in x ? <span className="text-[17px] text-muted">{x.suffix}</span> : null}
              </dd>
              <dd className="mt-1.5 text-[14px] text-muted">{x.k}</dd>
            </div>
          ))}
        </dl>
        {!finishedAll ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/" className="btn-primary">
              Continue day {cur}: {curDay.title} <IconArrow size={16} />
            </Link>
            <Link href={`/plan/${cur}`} className="btn-quiet">
              Preview the day
            </Link>
          </div>
        ) : null}
      </section>

      {/* Stages and weeks */}
      <div className="space-y-4">
        {STAGES.map((s) => {
          const first = firstDayOfStage(s.id);
          const last = s.id === 6 ? PLAN_DAYS : firstDayOfStage(s.id + 1) - 1;
          const total = last - first + 1;
          const done = Array.from({ length: total }, (_, i) => first + i).filter(isDone).length;
          const skipped = last < plan.startDay;
          const isCurrentStage = cur >= first && cur <= last;
          const weeks = WEEKS.filter((w) => w.week >= s.weeks[0] && w.week <= s.weeks[1]);
          return (
            <details key={s.id} open={isCurrentStage} className="group/stage rounded-[16px] border border-line">
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-[17px] font-semibold tabular ${
                    done === total ? "bg-ok text-white" : isCurrentStage ? "bg-accent text-white" : "border border-line-strong text-ink-soft"
                  }`}
                >
                  {done === total ? <IconCheck size={18} /> : s.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-[21px] font-semibold">{s.title}</span>
                    <span className="text-[15px] text-muted" lang="tr">
                      {s.titleTr}
                    </span>
                    <span className="pill bg-haze text-ink-soft">{s.level}</span>
                  </span>
                  <span className="mt-0.5 block text-[15px] text-ink-soft">{s.outcome}</span>
                </span>
                <span className="hidden shrink-0 text-right text-[14px] text-muted tabular sm:block">
                  {skipped ? "Skipped" : `${done} / ${total} days`}
                  <span className="mt-1.5 block w-28">
                    <ProgressBar value={done} max={total} tone={done === total ? "ok" : "accent"} />
                  </span>
                </span>
                <span className="text-muted transition-transform duration-200 group-open/stage:rotate-90" aria-hidden="true">
                  <IconArrow size={18} />
                </span>
              </summary>
              <ol className="border-t border-line">
                {weeks.map((w) => {
                  const wf = firstDayOfWeek(w.week);
                  const days = Array.from({ length: 7 }, (_, i) => wf + i);
                  const curWeek = days.includes(cur);
                  return (
                    <li key={w.week} className="border-b border-line last:border-b-0">
                      <details open={curWeek} className="group/week">
                        <summary className={`flex cursor-pointer list-none items-center gap-4 px-5 py-3.5 transition-colors hover:bg-haze [&::-webkit-details-marker]:hidden ${curWeek ? "bg-haze/60" : ""}`}>
                          <span className="w-14 shrink-0 text-[13px] text-muted tabular">Week {w.week}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{w.title}</span>
                            <span className="block truncate text-[14px] text-muted">{w.goal}</span>
                          </span>
                          <span className="hidden shrink-0 gap-1 sm:flex" aria-hidden="true">
                            {days.map((d) => (
                              <span
                                key={d}
                                className={`h-2.5 w-2.5 rounded-full ${isDone(d) ? "bg-ok" : d === cur ? "animate-here bg-accent" : "bg-line"}`}
                              />
                            ))}
                          </span>
                          <span className="text-[13px] text-muted tabular sm:hidden">{days.filter(isDone).length}/7</span>
                        </summary>
                        <ul className="stagger grid gap-px bg-line px-0 pb-px sm:grid-cols-7">
                          {days.map((d, i) => {
                            const pd = planDay(d);
                            const state = isDone(d) ? "done" : d === cur ? "current" : "later";
                            return (
                              <li key={d} className="bg-paper" style={{ "--i": i } as React.CSSProperties}>
                                <Link
                                  href={`/plan/${d}`}
                                  className={`flex h-full gap-3 px-5 py-3 transition-colors hover:bg-haze sm:flex-col sm:gap-1 sm:px-3 ${state === "current" ? "bg-accent-tint/50" : ""}`}
                                >
                                  <span className={`text-[12px] tabular ${state === "current" ? "font-semibold text-accent-text" : "text-muted"}`}>
                                    Day {d}
                                    {state === "done" ? <IconCheck size={12} className="ml-1 inline text-ok-text" /> : null}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-[12px] text-muted">{DAY_KIND_LABEL[pd.kind].en}</span>
                                    <span className={`block text-[14px] leading-snug ${state === "done" ? "text-ink-soft" : "text-ink"}`}>{pd.title}</span>
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    </li>
                  );
                })}
                {s.id === 6 ? (
                  <li className="px-5 py-3.5">
                    <Link href={`/plan/${PLAN_DAYS}`} className="flex items-center gap-4">
                      <span className="w-14 shrink-0 text-[13px] text-muted tabular">Day 365</span>
                      <span className="font-medium">Graduation</span>
                      <span className="text-[14px] text-muted" lang="tr">
                        Mezuniyet
                      </span>
                    </Link>
                  </li>
                ) : null}
              </ol>
            </details>
          );
        })}
      </div>

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="font-display text-[21px] font-semibold">Start again</h2>
        <p className="mt-1 max-w-[60ch] text-[15px] text-ink-soft">
          Moved faster or slower than planned? Rebuild the plan from a different starting point. Your words, reviews and suffix progress are kept.
        </p>
        <Link href="/plan?rebuild=1" className="btn-secondary mt-4">
          Rebuild my plan
        </Link>
      </section>
    </div>
  );
}
