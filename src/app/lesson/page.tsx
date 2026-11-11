import Link from "next/link";
import vocabJson from "../../../data/vocab.json";
import { GenerateLesson } from "@/components/catch-up";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { WeeklyQuiz } from "@/components/lesson/weekly-quiz";
import { PageTitle } from "@/components/ui";
import { getCardsByIds, knownWords } from "@/lib/db/cards";
import { getLesson, listLessons } from "@/lib/db/lessons";
import { today } from "@/lib/db/settings";
import { buildLexicon, generateDrills, generateMixedDrills, seededRng } from "@/lib/grammar/drills";
import { analyzeText } from "@/lib/lesson/analyze";
import type { DailyLesson } from "@/lib/lesson/schema";
import { listReports } from "@/lib/lesson/weekly";
import { trLower } from "@/lib/turkish";
import type { VocabEntry } from "@/lib/vocab/types";

export default async function LessonPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today();
  const row = getLesson(date);
  const past = listLessons(14).filter((l) => l.date !== date);

  if (!row) {
    return (
      <div className="space-y-4">
        <PageTitle en="Lesson" tr="Ders" />
        <div className="card space-y-3">
          <p>No lesson for {date} yet. It is generated automatically at 05:30 — or create it now.</p>
          {date === today() ? <GenerateLesson auto={false} /> : null}
        </div>
        <PastLessons lessons={past} />
      </div>
    );
  }

  const vocab = vocabJson as VocabEntry[];
  const known = new Set(knownWords(3000).map((c) => c.tr));
  const lex = buildLexicon(vocab, known);

  if (row.lesson.kind === "weekly") {
    const quiz = row.lesson;
    const cards = getCardsByIds(quiz.vocabCardIds);
    const drills = generateMixedDrills(quiz.maxStep, 10, lex, seededRng(quiz.drillSeed));
    const report = listReports().find((r) => r.week === quiz.weekStart) ?? null;
    return <WeeklyQuiz quiz={quiz} cards={cards} drills={drills} existingReport={row.completedAt ? report : null} />;
  }

  const lesson = row.lesson as DailyLesson;
  const warmupCards = getCardsByIds(lesson.warmupCardIds);
  const drills = generateDrills(lesson.grammarStepId, 8, lex, seededRng(lesson.drillSeed));
  const analysis = analyzeText(lesson.dialogue.lines.map((l) => l.tr).join(" "));
  // Claude's glossary (context-aware) takes precedence over the offline analyzer.
  for (const g of lesson.dialogue.glossary) {
    const key = trLower(g.word);
    if (key.includes(" ")) continue;
    analysis[key] = { word: g.word, root: g.breakdown[0] ?? g.word, meaning: g.meaning, parts: g.breakdown.length ? g.breakdown : [g.word], description: "" };
  }

  return (
    <div className="space-y-6">
      <LessonPlayer
        lesson={lesson}
        progress={row.progress}
        completed={!!row.completedAt}
        warmupCards={warmupCards}
        drills={drills}
        analysis={analysis}
      />
      <PastLessons lessons={past} />
    </div>
  );
}

function PastLessons({ lessons }: { lessons: ReturnType<typeof listLessons> }) {
  if (!lessons.length) return null;
  return (
    <section className="card">
      <h2 className="mb-2 font-semibold">
        Past lessons <span className="label-tr">· Geçmiş dersler</span>
      </h2>
      <ul className="divide-y divide-border text-sm">
        {lessons.map((l) => (
          <li key={l.date}>
            <Link href={`/lesson?date=${l.date}`} className="flex items-center justify-between gap-2 py-2 hover:text-sea">
              <span>
                <span className="text-muted">{l.date}</span> · {"title" in l.lesson ? l.lesson.title : ""}
              </span>
              <span>{l.completedAt ? "✓" : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
