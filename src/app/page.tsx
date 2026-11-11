import Link from "next/link";
import { GenerateLesson } from "@/components/catch-up";
import { Badge, ProgressBar, Stat } from "@/components/ui";
import { countDue } from "@/lib/db/cards";
import { currentGrammarStep, getStepStatuses } from "@/lib/db/grammar";
import { recentJobs } from "@/lib/db/jobs";
import { getLesson } from "@/lib/db/lessons";
import { ensureMission } from "@/lib/db/missions";
import { getSettings, today } from "@/lib/db/settings";
import { streak, totals } from "@/lib/db/stats";
import { getStep } from "@/lib/grammar/steps";
import { isAfterLessonTime, isSunday, learnerWeek, weekdayLabel } from "@/lib/time";

export default function TodayPage() {
  const s = getSettings();
  const date = today();
  const lesson = getLesson(date);
  const afterTime = isAfterLessonTime(new Date(), s.lessonTime, s.timezone);
  const { due, fresh } = countDue();
  const st = streak();
  const mission = ensureMission(date);
  const step = getStep(currentGrammarStep());
  const stepStatus = getStepStatuses().find((x) => x.stepId === step.id);
  const week = learnerWeek(s.startDate, date);
  const t = totals();
  const job = recentJobs(1)[0];
  const day = weekdayLabel(date);
  const reviewMinutes = Math.round(((due + fresh) * 9) / 60);
  const sunday = isSunday(date);

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {day.en} · {day.tr}, {date} · week {week} · hafta {week}
          </p>
          <h1 className="text-3xl font-bold">
            Today <span className="label-tr">· Bugün</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2">
          <span className="text-2xl" aria-hidden>
            🔥
          </span>
          <div>
            <div className="text-xl leading-none font-bold">{st.current}</div>
            <div className="text-xs text-muted">day streak · gün serisi</div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card md:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold">
              {sunday ? "Weekly check-in" : "Today's lesson"} <span className="label-tr">· {sunday ? "Haftalık değerlendirme" : "Bugünkü ders"}</span>
            </h2>
            {lesson ? (
              lesson.completedAt ? (
                <Badge tone="good">Done · Bitti ✓</Badge>
              ) : (
                <Badge tone="sea">Ready · Hazır</Badge>
              )
            ) : null}
          </div>
          {lesson ? (
            <div className="space-y-3">
              <div>
                <div className="text-xl font-bold">{"title" in lesson.lesson ? lesson.lesson.title : ""}</div>
                <div className="text-muted">{"titleTr" in lesson.lesson ? lesson.lesson.titleTr : ""}</div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {lesson.kind === "daily" ? (
                  <>
                    <span className="chip">≈ 20 min</span>
                    <span className="chip">Grammar: {step.title}</span>
                    <span className="chip">{lesson.source === "claude" ? "✨ Written by Claude" : "📦 Offline lesson"}</span>
                  </>
                ) : (
                  <span className="chip">≈ 10 min · 15 words + 10 drills + 1 translation</span>
                )}
              </div>
              <Link href="/lesson" className="btn-primary">
                {lesson.completedAt ? "Review lesson · Tekrar et" : lesson.progress.section > 0 ? "Continue · Devam et" : "Start · Başla"} →
              </Link>
            </div>
          ) : afterTime ? (
            <GenerateLesson auto />
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted">
                Today&apos;s lesson will be ready at <b>{s.lessonTime}</b> ({s.timezone}). Do your reviews first — or generate it now.
              </p>
              <GenerateLesson auto={false} />
            </div>
          )}
        </section>

        <section className="card flex flex-col justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              Reviews <span className="label-tr">· Tekrarlar</span>
            </h2>
            <div className="mt-2 text-4xl font-bold">{due + fresh}</div>
            <p className="text-sm text-muted">
              Reviews due: {due} · new words: {fresh}
              <br />≈ {Math.max(1, reviewMinutes)} min
            </p>
          </div>
          <Link href="/review" className={due + fresh ? "btn-primary" : "btn-ghost"}>
            {due + fresh ? "Start reviews · Başla" : "All done · Hepsi bitti 🎉"}
          </Link>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold">
              This week&apos;s mission <span className="label-tr">· Haftanın görevi</span>
            </h2>
            <Badge tone={mission.status === "done" ? "good" : mission.status === "struggled" ? "warn" : "accent"}>
              {mission.status === "done" ? "Done ✅" : mission.status === "struggled" ? "Tried ⚠️" : "Active"}
            </Badge>
          </div>
          <div className="text-lg font-bold">{mission.mission.title}</div>
          <div className="text-sm text-muted">{mission.mission.titleTr}</div>
          <p className="mt-2 text-sm">{mission.mission.goal}</p>
          <Link href="/missions" className="btn-ghost mt-3">
            Phrase sheet · İfadeler →
          </Link>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">
            Grammar step {step.id}/16 <span className="label-tr">· Dilbilgisi</span>
          </h2>
          <div>
            <div className="font-bold">{step.title}</div>
            <div className="text-sm text-muted">{step.titleTr}</div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Mastery (last 20) · Ustalık</span>
              <span>{Math.round((stepStatus?.mastery ?? 0) * 100)}% / 90%</span>
            </div>
            <ProgressBar value={stepStatus?.mastery ?? 0} />
          </div>
          <Link href={`/gym?step=${step.id}`} className="btn-ghost">
            Suffix Gym · Ek Antrenmanı →
          </Link>
        </section>
      </div>

      {week <= 2 ? (
        <section className="card flex flex-wrap items-center justify-between gap-3 border-sea bg-sea-soft">
          <div>
            <h2 className="font-semibold">
              Week {week}: sounds first <span className="label-tr">· Önce sesler</span>
            </h2>
            <p className="text-sm">Learn the 29 letters and practise listen-and-spell — especially c, ç, ğ, ı, ö, ş, ü.</p>
          </div>
          <Link href="/alphabet" className="btn-primary">
            Alphabet · Alfabe →
          </Link>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Words met" labelTr="Kelimeler" value={t.introduced} hint={`of ${t.seedCards}`} />
        <Stat label="Mature" labelTr="Oturmuş" value={t.mature} hint="interval ≥ 21 days" />
        <Stat label="Lessons" labelTr="Dersler" value={t.lessonsDone} />
        <Stat label="Best streak" labelTr="En iyi seri" value={st.best} />
      </section>

      {job ? (
        <p className="text-xs text-muted">
          Last lesson job: {job.status} · {new Date(job.startedAt).toLocaleString("en-GB", { timeZone: s.timezone })}
          {job.message ? ` — ${job.message}` : ""}
        </p>
      ) : null}
    </div>
  );
}
