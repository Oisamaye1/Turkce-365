import vocabJson from "../../../data/vocab.json";
import { GenerateLesson } from "@/components/catch-up";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { WeeklyQuiz } from "@/components/lesson/weekly-quiz";
import { FocusShell } from "@/components/focus";
import { getCardsByIds, knownWords } from "@/lib/db/cards";
import { getLesson } from "@/lib/db/lessons";
import { today } from "@/lib/db/settings";
import { buildLexicon, generateDrills, generateMixedDrills, seededRng } from "@/lib/grammar/drills";
import { analyzeText } from "@/lib/lesson/analyze";
import type { DailyLesson } from "@/lib/lesson/schema";
import { listReports } from "@/lib/lesson/weekly";
import { trLower } from "@/lib/turkish";
import { exercisePool, learnerStage } from "@/lib/srs/stage";
import type { VocabEntry } from "@/lib/vocab/types";

export default async function LessonPage({ searchParams }: { searchParams: Promise<{ date?: string; s?: string }> }) {
  const sp = await searchParams;
  const todayDate = await today();
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayDate;
  const row = await getLesson(date);

  if (!row) {
    return (
      <FocusShell progress={0} max={1}>
        <div className="pt-6">
          <h1 className="display-xl text-[48px] sm:text-[64px]">Henüz ders yok.</h1>
          <p className="mt-4 max-w-[46ch] text-[17px] text-ink-soft">
            There is no lesson for {date} yet. Lessons are written every morning at 05:30{date === todayDate ? ", and you can make today's lesson right now" : ""}.
          </p>
          <div className="mt-8">{date === todayDate ? <GenerateLesson auto={false} /> : null}</div>
        </div>
      </FocusShell>
    );
  }

  const vocab = vocabJson as VocabEntry[];
  const [stage, pool] = await Promise.all([learnerStage(), exercisePool()]);
  const known = new Set((await knownWords(3000)).map((c) => c.tr));
  const lex = buildLexicon(vocab, known);

  if (row.lesson.kind === "weekly") {
    const quiz = row.lesson;
    const cards = await getCardsByIds(quiz.vocabCardIds);
    const drills = generateMixedDrills(quiz.steps ?? quiz.maxStep, 10, lex, seededRng(quiz.drillSeed));
    const report = (await listReports()).find((r) => r.week === quiz.weekStart) ?? null;
    return <WeeklyQuiz quiz={quiz} cards={cards} drills={drills} existingReport={row.completedAt ? report : null} stage={stage} pool={pool} />;
  }

  const lesson = row.lesson as DailyLesson;
  const warmupCards = await getCardsByIds(lesson.warmupCardIds);
  const drills = generateDrills(lesson.grammarStepId, 8, lex, seededRng(lesson.drillSeed));
  const analysis = analyzeText(lesson.dialogue.lines.map((l) => l.tr).join(" "));
  // Claude's glossary (context-aware) takes precedence over the offline analyzer.
  for (const g of lesson.dialogue.glossary) {
    const key = trLower(g.word);
    if (key.includes(" ")) continue;
    analysis[key] = { word: g.word, root: g.breakdown[0] ?? g.word, meaning: g.meaning, parts: g.breakdown.length ? g.breakdown : [g.word], description: "" };
  }

  return (
    <>
      <LessonPlayer
        lesson={lesson}
        progress={row.progress}
        completed={!!row.completedAt}
        warmupCards={warmupCards}
        stage={stage}
        pool={pool}
        drills={drills}
        analysis={analysis}
        initialSection={sp.s !== undefined && /^[0-4]$/.test(sp.s) ? Number(sp.s) : undefined}
      />
    </>
  );
}
