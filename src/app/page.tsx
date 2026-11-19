import Link from "next/link";
import unitsJson from "../../data/units.json";
import { WordAnatomy } from "@/components/anatomy";
import { GenerateLesson } from "@/components/catch-up";
import { PlanDayChecklist } from "@/components/plan/plan-day";
import { InstallHint } from "@/components/pwa";
import { DAY_KIND_LABEL, firstDayOfWeek, grammarStarted, planDay } from "@/lib/plan/build";
import { planDayProps } from "@/lib/plan/props";
import { getPlanRows } from "@/lib/db/plan";
import { getActivity } from "@/lib/db/activity";
import { CHAPTERS } from "@/lib/learn/chapters";
import { GAMES } from "@/lib/practice/catalog";
import { STORIES } from "@/lib/read/stories";
import { IconArrow, IconCheck, IconFlame, IconRoute } from "@/components/icons";
import { SessionSteps, type SessionStep, type StepState } from "@/components/session";
import { ProgressBar } from "@/components/ui";
import { countDue, currentUnit } from "@/lib/db/cards";
import { currentGrammarStep, getStepStatuses } from "@/lib/db/grammar";
import { getLesson } from "@/lib/db/lessons";
import { ensureMission } from "@/lib/db/missions";
import { getSettings, today } from "@/lib/db/settings";
import { activeDates, streak } from "@/lib/db/stats";
import { STEP_ANATOMY } from "@/lib/grammar/anatomy";
import { getStep } from "@/lib/grammar/steps";
import { addDays, isAfterLessonTime, isSunday, learnerWeek, localTime, mondayOf, weekdayLabel } from "@/lib/time";

const UNITS = unitsJson as { unit: number; title: string; titleTr: string }[];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Turkish greeting for the learner's local time of day. */
function greeting(hhmm: string): { tr: string; en: string } {
  const h = Number(hhmm.slice(0, 2));
  if (h >= 5 && h < 11) return { tr: "Günaydın.", en: "Good morning." };
  if (h >= 11 && h < 17) return { tr: "İyi günler.", en: "Good afternoon." };
  if (h >= 17 && h < 22) return { tr: "İyi akşamlar.", en: "Good evening." };
  return { tr: "İyi geceler.", en: "Good night." };
}

export default async function TodayPage() {
  const s = await getSettings();
  const date = await today();
  const [lesson, due, st, mission, gStep, statuses, unitNo, active, planData, activity] = await Promise.all([
    getLesson(date),
    countDue(),
    streak(),
    ensureMission(date),
    currentGrammarStep(),
    getStepStatuses(),
    currentUnit(),
    activeDates(),
    planDayProps(),
    getActivity(),
  ]);
  const pd = planData?.props.day;
  const step = getStep(pd ? pd.step : gStep);
  const stepStatus = statuses.find((x) => x.stepId === step.id);
  const unit = UNITS.find((u) => u.unit === unitNo) ?? UNITS[0];
  const week = learnerWeek(s.startDate, date);
  const afterTime = isAfterLessonTime(new Date(), s.lessonTime, s.timezone);
  const reviewsLeft = due.due + due.fresh;
  const sunday = isSunday(date);
  const monday = mondayOf(date);
  const hello = greeting(localTime(new Date(), s.timezone));
  const day = weekdayLabel(date);
  const dd = date.split("-")[2];
  const monthName = new Date(`${date}T12:00:00Z`).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  const anatomy = STEP_ANATOMY[step.id];

  // ---- today's session
  const section = lesson?.completedAt ? 99 : (lesson?.progress.section ?? 0);
  const lessonState = (i: number): StepState => (!lesson ? "locked" : section > i ? "done" : "next");
  const lessonTitle = lesson && "title" in lesson.lesson ? lesson.lesson.title : undefined;
  const steps: SessionStep[] = [
    {
      key: "reviews",
      title: reviewsLeft ? `${reviewsLeft} reviews` : "Reviews",
      titleTr: "Tekrar",
      detail: due.fresh ? `${due.fresh} new words` : undefined,
      minutes: reviewsLeft ? Math.max(1, Math.round((reviewsLeft * 9) / 60)) : undefined,
      href: "/review",
      state: reviewsLeft === 0 ? "done" : "next",
    },
    ...(sunday
      ? [{ key: "quiz", title: "Weekly check-in", titleTr: "Haftalık değerlendirme", minutes: 10, href: "/lesson", state: lessonState(0) }]
      : [
          { key: "warmup", title: "Warm-up", titleTr: "Isınma", detail: "recent mistakes", minutes: 3, href: "/lesson?s=0", state: lessonState(0) },
          { key: "dialogue", title: lessonTitle ? `Dialogue: ${lessonTitle}` : "Dialogue", titleTr: "Diyalog", minutes: 5, href: "/lesson?s=1", state: lessonState(1) },
          { key: "phrases", title: "Five new phrases", titleTr: "Yeni ifadeler", minutes: 3, href: "/lesson?s=2", state: lessonState(2) },
          { key: "grammar", title: `Grammar: ${step.title}`, titleTr: "Dilbilgisi", minutes: 4, href: "/lesson?s=3", state: lessonState(3) },
          { key: "writing", title: "Write a few sentences", titleTr: "Yazma", minutes: 5, href: "/lesson?s=4", state: lessonState(4) },
        ]),
  ];
  const firstOpen = steps.find((x) => x.state === "next");
  if (firstOpen) firstOpen.state = "current";
  let total = steps.reduce((a, x) => a + (x.state === "done" ? 0 : (x.minutes ?? 0)), 0);
  let allDone = steps.every((x) => x.state === "done");

  // ---- learning plan
  const planRows = planData ? await getPlanRows() : null;
  const finishedToday = planData?.props.finishedToday ?? 0;
  if (planData && pd) {
    const open = pd.tasks.filter((t, i) => !t.optional && !planData.view.tasks[i]?.done);
    total = open.reduce((a, t) => a + t.minutes, 0);
    allDone = finishedToday > 0;
  }
  // Something extra beside the plan: the course chapter for this week, a story at your level, a game.
  const curWeek = pd?.week ?? week;
  const curStage = pd?.stage.id ?? 1;
  const extraChapter = CHAPTERS.find((c) => c.week <= curWeek && !activity.learn[c.id]) ?? CHAPTERS.find((c) => !activity.learn[c.id]);
  const extraStory = STORIES.find((x) => x.stage <= curStage && !activity.read[x.id]);
  const extraGame = GAMES.find((g) => g.id === (curStage <= 2 ? "harmony" : "lightning"))!;
  const weekDays = pd ? Array.from({ length: 7 }, (_, i) => firstDayOfWeek(pd.week) + i) : [];

  return (
    <div>
      <InstallHint />
      {/* Greeting hero */}
      <section className="mb-10 lg:mb-14">
        <p className="text-[15px] text-muted">
          {day.en} {Number(dd)} {monthName}
          {pd ? `, day ${pd.day} of your plan` : `, week ${week}`}
        </p>
        <h1 className="display-xl mt-2 text-[56px] text-ink sm:text-[80px]" lang="tr">
          {hello.tr}
        </h1>
        <p className="mt-3 text-[17px] text-ink-soft">
          {hello.en}{" "}
          {allDone
            ? pd
              ? `You finished ${finishedToday > 1 ? `${finishedToday} days` : "today's day"} of your plan. Aferin.`
              : "Everything for today is done. Aferin."
            : total
              ? `About ${total} minutes left today.`
              : "Your lesson arrives soon."}
        </p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[15px] text-ink-soft tabular">
          <span className="flex items-center gap-2">
            <IconFlame size={18} className={st.current ? "text-accent" : "text-muted"} />
            <span>
              <b className="font-semibold text-ink">{st.current}</b>-day streak
            </span>
          </span>
          <span>
            <b className="font-semibold text-ink">{reviewsLeft}</b> reviews waiting
          </span>
          {pd ? (
            <Link href="/plan" className="hover:text-ink">
              Week <b className="font-semibold text-ink">{pd.week}</b>, {pd.weekInfo.title}
            </Link>
          ) : (
            <span>
              Unit <b className="font-semibold text-ink">{unit.unit}</b>, {unit.title}
            </span>
          )}
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Today's plan day, or the plain session without a plan */}
        {planData && pd ? (
          <section aria-labelledby="plan-h" className="min-w-0">
            {finishedToday > 0 ? (
              <div className="mb-8 flex animate-rise items-start gap-4 rounded-[14px] bg-ok-tint p-5">
                <span className="grid h-9 w-9 shrink-0 animate-pop place-items-center rounded-full bg-ok text-white">
                  <IconCheck size={18} />
                </span>
                <div>
                  <p className="font-display text-[19px] font-semibold text-ok-text">Today&apos;s plan is done.</p>
                  <p className="text-[15px] text-ink-soft">
                    Day {pd.day} is below if you want to keep going. Otherwise it&apos;ll be here tomorrow.
                  </p>
                </div>
              </div>
            ) : null}
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 id="plan-h" className="font-display text-[26px] leading-tight font-semibold">
                <span className="text-muted">Day {pd.day}.</span> {pd.title}
              </h2>
              <span className="shrink-0 text-[14px] text-muted">{DAY_KIND_LABEL[pd.kind].en} day</span>
            </div>
            <PlanDayChecklist {...planData.props} />
            {!lesson && pd.tasks.some((t) => t.key === "lesson") ? (
              <div className="mt-6 rounded-[14px] bg-haze p-5">
                {afterTime ? (
                  <GenerateLesson auto />
                ) : (
                  <div className="space-y-3">
                    <p className="text-ink-soft">
                      Today&apos;s lesson is written at <b className="text-ink">{s.lessonTime}</b>. Start with the other tasks, or make it now.
                    </p>
                    <GenerateLesson auto={false} />
                  </div>
                )}
              </div>
            ) : null}
          </section>
        ) : (
        <section aria-labelledby="session-h">
          <Link
            href="/plan"
            className="group mb-10 flex animate-rise items-center gap-5 rounded-[16px] border border-line bg-brand-tint/40 p-5 transition-colors hover:border-brand sm:p-6"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-white">
              <IconRoute size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[21px] leading-snug font-semibold">Build your year of Turkish</span>
              <span className="mt-0.5 block text-[15px] text-ink-soft">
                A day-by-day plan from zero to real conversations, with a tiny challenge every day.
              </span>
            </span>
            <IconArrow size={20} className="shrink-0 text-brand-text transition-transform group-hover:translate-x-1" />
          </Link>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="session-h" className="font-display text-[26px] font-semibold">
              {sunday ? "Sunday check-in" : "Today's session"}
            </h2>
            {lesson && lesson.kind === "daily" ? (
              <span className="text-[14px] text-muted">{lesson.source === "claude" ? "Written by Claude for you" : "Offline lesson"}</span>
            ) : null}
          </div>
          <SessionSteps steps={steps} />
          {!lesson ? (
            <div className="mt-6 rounded-[14px] bg-haze p-5">
              {afterTime ? (
                <GenerateLesson auto />
              ) : (
                <div className="space-y-3">
                  <p className="text-ink-soft">
                    Today&apos;s lesson is written at <b className="text-ink">{s.lessonTime}</b>. Start with your reviews, or make it now.
                  </p>
                  <GenerateLesson auto={false} />
                </div>
              )}
            </div>
          ) : null}
        </section>
        )}

        {/* Side column */}
        <aside className="space-y-10">
          {pd && planRows ? (
            <section aria-labelledby="pweek-h">
              <h2 id="pweek-h" className="text-[15px] text-muted">
                Week {pd.week} of 52, {pd.stage.title}
              </h2>
              <p className="font-display mt-2 text-[21px] leading-snug font-semibold">{pd.weekInfo.goal}</p>
              <ol className="mt-4 grid grid-cols-7 gap-1.5">
                {weekDays.map((x, i) => {
                  const done = x < planData!.view.plan.startDay || !!planRows.get(x)?.completedAt;
                  const cur = x === pd.day;
                  return (
                    <li key={x}>
                      <Link
                        href={`/plan/${x}`}
                        title={`Day ${x}: ${planDay(x).title}`}
                        className={`grid h-9 place-items-center rounded-lg text-[13px] tabular transition-colors ${
                          done ? "bg-ok text-white" : cur ? "animate-here bg-accent text-white" : "bg-haze text-muted hover:bg-line"
                        }`}
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        {done ? <IconCheck size={14} /> : x}
                      </Link>
                    </li>
                  );
                })}
              </ol>
              <Link href="/plan" className="btn-quiet mt-3 -ml-2">
                See the whole plan <IconArrow size={16} />
              </Link>
            </section>
          ) : null}

          {anatomy && (!pd || grammarStarted(pd.day)) ? (
            <section aria-labelledby="anatomy-h" className={pd ? "border-t border-line pt-8" : ""}>
              <h2 id="anatomy-h" className="text-[15px] text-muted">
                Suffix focus: {step.title}
              </h2>
              <div className="mt-4">
                <WordAnatomy parts={anatomy.parts} labels={anatomy.labels} size="lg" />
              </div>
              <p className="mt-4 text-ink-soft">“{anatomy.en}”</p>
              <div className="mt-5 flex items-center gap-3">
                <ProgressBar value={stepStatus?.mastery ?? 0} tone="ok" />
                <span className="shrink-0 text-[14px] text-muted tabular">{Math.round((stepStatus?.mastery ?? 0) * 100)}%</span>
              </div>
              <Link href={`/gym?step=${step.id}`} className="btn-quiet mt-3 -ml-2">
                Practise this suffix <IconArrow size={16} />
              </Link>
            </section>
          ) : null}

          <section aria-labelledby="mission-h" className="border-t border-line pt-8">
            <h2 id="mission-h" className="text-[15px] text-muted">
              This week&apos;s mission
            </h2>
            <p className="font-display mt-2 text-[21px] leading-snug font-semibold">{mission.mission.title}</p>
            <p className="mt-1.5 text-ink-soft">{mission.mission.goal}</p>
            <div className="mt-3 flex items-center gap-3">
              <Link href="/missions" className="btn-quiet -ml-2">
                Phrase sheet <IconArrow size={16} />
              </Link>
              {mission.status !== "active" ? (
                <span className={`pill ${mission.status === "done" ? "bg-ok-tint text-ok-text" : "bg-warn-tint text-warn-text"}`}>
                  {mission.status === "done" ? "Done" : "Tried it"}
                </span>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="week-h" className="border-t border-line pt-8">
            <h2 id="week-h" className="text-[15px] text-muted">
              This week
            </h2>
            <ol className="mt-3 grid grid-cols-7 gap-1.5 text-center">
              {DAYS.map((d, i) => {
                const dayDate = addDays(monday, i);
                const on = active.has(dayDate);
                const isToday = dayDate === date;
                return (
                  <li key={d} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[12px] ${isToday ? "font-semibold text-ink" : "text-muted"}`}>{d}</span>
                    <span
                      className={`h-2.5 w-full rounded-full ${on ? "bg-accent" : isToday ? "bg-accent-tint" : "bg-line"}`}
                      aria-label={`${d}${on ? ", practised" : ""}`}
                    />
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-[14px] text-muted">Best streak so far: {st.best} day{st.best === 1 ? "" : "s"}</p>
          </section>

          <section aria-labelledby="extra-h" className="border-t border-line pt-8">
            <h2 id="extra-h" className="text-[15px] text-muted">
              Extra practice
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {[
                extraChapter ? { href: `/learn/${extraChapter.id}`, kind: "Learn", title: extraChapter.title } : null,
                extraStory ? { href: `/read/${extraStory.id}`, kind: `Read, ${extraStory.level}`, title: extraStory.title } : null,
                { href: `/practice/${extraGame.id}`, kind: "Play", title: extraGame.title },
              ]
                .filter((x): x is { href: string; kind: string; title: string } => !!x)
                .map((x) => (
                  <li key={x.href}>
                    <Link href={x.href} className="group flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-[12px] text-muted">{x.kind}</span>
                        <span className="block truncate text-[15px] font-medium text-ink">{x.title}</span>
                      </span>
                      <IconArrow size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>

          {week <= 2 && !pd ? (
            <Link href="/alphabet" className="block rounded-[14px] border border-line p-5 hover:bg-haze">
              <p className="font-display text-[19px] font-semibold">Start with the sounds</p>
              <p className="mt-1 text-[15px] text-ink-soft">The 29 letters, and the seven that differ from English: c ç ğ ı ö ş ü.</p>
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
