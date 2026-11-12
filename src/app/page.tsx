import Link from "next/link";
import unitsJson from "../../data/units.json";
import { GenerateLesson } from "@/components/catch-up";
import { IconBook, IconCards, IconChat, IconFlame, IconKey, IconPen, IconSpark, IconTrophy } from "@/components/icons";
import { SessionPath, type NodeState, type PathNode } from "@/components/path";
import { Simit } from "@/components/simit";
import { ProgressBar, SpeechBubble } from "@/components/ui";
import { countDue, currentUnit } from "@/lib/db/cards";
import { currentGrammarStep, getStepStatuses } from "@/lib/db/grammar";
import { getLesson } from "@/lib/db/lessons";
import { ensureMission } from "@/lib/db/missions";
import { getSettings, today } from "@/lib/db/settings";
import { activeDates, streak, totals } from "@/lib/db/stats";
import { getStep } from "@/lib/grammar/steps";
import { addDays, isAfterLessonTime, isSunday, learnerWeek, mondayOf } from "@/lib/time";

const UNITS = unitsJson as { unit: number; title: string; titleTr: string }[];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function LearnPage() {
  const s = await getSettings();
  const date = await today();
  const [lesson, due, st, mission, stepId, statuses, t, unitNo, active] = await Promise.all([
    getLesson(date),
    countDue(),
    streak(),
    ensureMission(date),
    currentGrammarStep(),
    getStepStatuses(),
    totals(),
    currentUnit(),
    activeDates(),
  ]);
  const step = getStep(stepId);
  const stepStatus = statuses.find((x) => x.stepId === step.id);
  const unit = UNITS.find((u) => u.unit === unitNo) ?? UNITS[0];
  const week = learnerWeek(s.startDate, date);
  const afterTime = isAfterLessonTime(new Date(), s.lessonTime, s.timezone);
  const reviewsLeft = due.due + due.fresh;
  const sunday = isSunday(date);
  const monday = mondayOf(date);

  // ---- build today's path
  const section = lesson?.completedAt ? 99 : (lesson?.progress.section ?? 0);
  const reviewsState: NodeState = reviewsLeft === 0 ? "done" : "current";
  const lessonState = (i: number): NodeState => {
    if (!lesson) return "locked";
    if (section > i) return "done";
    if (section === i) return reviewsLeft === 0 || section > 0 ? "current" : "next";
    return "next";
  };
  const nodes: PathNode[] = [
    { key: "reviews", title: reviewsLeft ? `${reviewsLeft} reviews` : "Reviews", titleTr: "Tekrar", href: "/review", state: reviewsState, icon: <IconCards size={36} />, tone: "turkuaz", minutes: reviewsLeft ? Math.max(1, Math.round((reviewsLeft * 9) / 60)) : undefined },
    ...(sunday
      ? [
          { key: "quiz", title: "Weekly check-in", titleTr: "Haftalık değerlendirme", href: "/lesson", state: lessonState(0), icon: <IconSpark size={34} />, tone: "kobalt" as const, minutes: 10 },
        ]
      : [
          { key: "warmup", title: "Warm-up", titleTr: "Isınma", href: "/lesson?s=0", state: lessonState(0), icon: <IconFlame size={36} />, tone: "cay" as const, minutes: 3 },
          { key: "dialogue", title: "Dialogue", titleTr: "Diyalog", href: "/lesson?s=1", state: lessonState(1), icon: <IconChat size={34} />, tone: "kobalt" as const, minutes: 5 },
          { key: "phrases", title: "New phrases", titleTr: "Yeni ifadeler", href: "/lesson?s=2", state: lessonState(2), icon: <IconSpark size={34} />, tone: "turkuaz" as const, minutes: 3 },
          { key: "grammar", title: "Grammar", titleTr: "Dilbilgisi", href: "/lesson?s=3", state: lessonState(3), icon: <IconKey size={34} />, tone: "nar" as const, minutes: 4 },
          { key: "writing", title: "Writing", titleTr: "Yazma", href: "/lesson?s=4", state: lessonState(4), icon: <IconPen size={32} />, tone: "kobalt" as const, minutes: 5 },
        ]),
    {
      key: "finish",
      title: "Done for today",
      titleTr: "Bugünlük bitti",
      href: lesson ? "/lesson" : null,
      state: lesson?.completedAt ? "done" : "locked",
      icon: <IconTrophy size={40} />,
      tone: "cay",
      finish: true,
    },
  ];
  // Only one "current" node: the first unfinished one.
  let seenCurrent = false;
  for (const n of nodes) {
    if (n.state === "current") {
      if (seenCurrent) n.state = "next";
      seenCurrent = true;
    }
  }
  if (!seenCurrent) {
    const firstOpen = nodes.find((n) => n.state === "next");
    if (firstOpen) firstOpen.state = "current";
  }
  const allDone = !!lesson?.completedAt && reviewsLeft === 0;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {/* Unit banner */}
        <section className="iznik relative overflow-hidden rounded-3xl bg-banner px-5 py-5 text-white shadow-[0_5px_0_var(--banner-depth)] sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold text-white/75">
                Week {week}, unit {unit.unit}
              </p>
              <h1 className="font-display text-[28px] leading-tight font-extrabold">{unit.title}</h1>
              <p className="text-white/80" lang="tr">
                {unit.titleTr}
              </p>
            </div>
            <Link
              href={`/gym?step=${step.id}`}
              className="font-display flex items-center gap-2 rounded-2xl border-2 border-white/35 px-4 py-2.5 font-bold hover:bg-white/10"
            >
              <IconBook size={22} />
              Grammar guide
            </Link>
          </div>
        </section>

        {/* Lesson status / generation */}
        {!lesson ? (
          <div className="mx-auto mt-6 flex max-w-md items-start gap-3">
            <Simit size={72} mood="calm" className="shrink-0" />
            <SpeechBubble className="flex-1">
              {afterTime ? (
                <GenerateLesson auto />
              ) : (
                <div className="space-y-3">
                  <p>
                    Your lesson arrives at <b>{s.lessonTime}</b>. Start with your reviews — or make the lesson now.
                  </p>
                  <GenerateLesson auto={false} label="Make today's lesson" />
                </div>
              )}
            </SpeechBubble>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="font-display text-xl font-extrabold">{"title" in lesson.lesson ? lesson.lesson.title : ""}</p>
            <p className="text-sm text-muted" lang="tr">
              {"titleTr" in lesson.lesson ? lesson.lesson.titleTr : ""}
              {lesson.kind === "daily" ? (lesson.source === "claude" ? ", written by Claude for you" : ", offline lesson") : ""}
            </p>
          </div>
        )}

        <div className="relative mt-14">
          <SessionPath nodes={nodes} />
          <div className="pointer-events-none absolute top-[38%] right-0 hidden sm:block" aria-hidden="true">
            <Simit size={110} mood={allDone ? "proud" : "calm"} />
          </div>
        </div>

        {allDone ? (
          <div className="mx-auto mt-4 flex max-w-md items-center gap-3">
            <Simit size={64} mood="happy" className="shrink-0 sm:hidden" />
            <SpeechBubble className="flex-1">
              <b>Aferin!</b> Everything for today is done. Practise in the Suffix gym, or try this week&apos;s mission in real life.
            </SpeechBubble>
          </div>
        ) : null}
      </div>

      {/* Right rail */}
      <aside className="space-y-4">
        <section className="card">
          <div className="flex items-center gap-3">
            <IconFlame size={44} lit={st.current > 0} />
            <div>
              <p className="font-display text-3xl leading-none font-extrabold text-cay-depth">{st.current}</p>
              <p className="text-sm text-ink-soft">day streak, best {st.best}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
            {DAYS.map((d, i) => {
              const day = addDays(monday, i);
              const on = active.has(day);
              const isToday = day === date;
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <span className={`text-xs ${isToday ? "font-bold text-ink" : "text-muted"}`}>{d}</span>
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full ${on ? "bg-cay text-white" : isToday ? "border-2 border-cay bg-paper" : "bg-wash"}`}
                    aria-label={`${day}${on ? ", practised" : ""}`}
                  >
                    {on ? <IconFlame size={18} lit={false} /> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted">This week&apos;s mission</p>
              <h2 className="font-display text-xl leading-tight font-extrabold">{mission.mission.title}</h2>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                mission.status === "done" ? "bg-zeytin-tint text-zeytin-depth" : mission.status === "struggled" ? "bg-cay-tint text-cay-depth" : "bg-nar-tint text-nar-depth"
              }`}
            >
              {mission.status === "done" ? "Done" : mission.status === "struggled" ? "Tried" : "To do"}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{mission.mission.goal}</p>
          <Link href="/missions" className="btn-ghost mt-4 w-full">
            Open phrase sheet
          </Link>
        </section>

        <section className="card">
          <p className="text-sm text-muted">Grammar step {step.id} of 16</p>
          <h2 className="font-display text-xl leading-tight font-extrabold">{step.title}</h2>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={stepStatus?.mastery ?? 0} tone="zeytin" />
            <span className="font-display shrink-0 font-bold text-ink-soft">{Math.round((stepStatus?.mastery ?? 0) * 100)}%</span>
          </div>
          <p className="mt-1 text-xs text-muted">Reach 90% over 20 drills to unlock the next step.</p>
          <Link href={`/gym?step=${step.id}`} className="btn-ghost mt-4 w-full">
            Practise suffixes
          </Link>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="card !p-3">
            <p className="font-display text-2xl font-extrabold text-kobalt">{t.introduced}</p>
            <p className="text-sm text-ink-soft">words met</p>
          </div>
          <div className="card !p-3">
            <p className="font-display text-2xl font-extrabold text-turkuaz-depth">{t.lessonsDone}</p>
            <p className="text-sm text-ink-soft">lessons done</p>
          </div>
        </section>

        {week <= 2 ? (
          <Link href="/alphabet" className="card block hover:bg-wash">
            <p className="font-display text-lg font-extrabold">New here? Start with the sounds</p>
            <p className="text-sm text-ink-soft">29 letters, and the seven that differ from English: c ç ğ ı ö ş ü.</p>
          </Link>
        ) : null}
      </aside>
    </div>
  );
}
