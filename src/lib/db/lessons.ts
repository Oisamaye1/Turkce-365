import { getDb } from "./index";
import type { StoredLesson } from "@/lib/lesson/schema";

export interface LessonProgress {
  /** Index of the section the learner is on. */
  section: number;
  phrasesAdded?: boolean;
  warmup?: { correct: number; total: number };
  drills?: { correct: number; total: number };
  writingId?: number;
  quiz?: { vocab?: { correct: number; total: number }; drills?: { correct: number; total: number }; translation?: string };
}

export interface LessonRow {
  date: string;
  kind: "daily" | "weekly";
  source: "claude" | "fallback";
  lesson: StoredLesson;
  progress: LessonProgress;
  /** True when the learner has opened a section (worker must not replace it then). */
  started: boolean;
  createdAt: string;
  completedAt: string | null;
}

interface Row {
  date: string;
  kind: "daily" | "weekly";
  source: "claude" | "fallback";
  json: string;
  progress: string | null;
  created_at: string;
  completed_at: string | null;
}

const toLesson = (r: Row): LessonRow => ({
  date: r.date,
  kind: r.kind,
  source: r.source,
  lesson: JSON.parse(r.json),
  progress: r.progress ? JSON.parse(r.progress) : { section: 0 },
  started: !!r.progress,
  createdAt: r.created_at,
  completedAt: r.completed_at,
});

export async function getLesson(date: string): Promise<LessonRow | null> {
  const db = await getDb();
  const r = await db.one<Row>("SELECT * FROM lessons WHERE date = ?", [date]);
  return r ? toLesson(r) : null;
}

export async function saveLesson(lesson: StoredLesson) {
  const db = await getDb();
  await db.run(
    `INSERT INTO lessons (date, kind, source, json) VALUES (?, ?, ?, ?)
     ON CONFLICT (date) DO UPDATE SET kind = excluded.kind, source = excluded.source, json = excluded.json,
       progress = NULL, completed_at = NULL, created_at = excluded.created_at`,
    [lesson.date, lesson.kind, lesson.source, JSON.stringify(lesson)],
  );
}

export async function saveProgress(date: string, progress: LessonProgress) {
  const db = await getDb();
  await db.run("UPDATE lessons SET progress = ? WHERE date = ?", [JSON.stringify(progress), date]);
}

export async function completeLesson(date: string) {
  const db = await getDb();
  await db.run("UPDATE lessons SET completed_at = COALESCE(completed_at, ?) WHERE date = ?", [new Date().toISOString(), date]);
}

export async function listLessons(limit = 30): Promise<LessonRow[]> {
  const db = await getDb();
  return (await db.all<Row>("SELECT * FROM lessons ORDER BY date DESC LIMIT ?", [limit])).map(toLesson);
}

export async function lessonsBetween(from: string, to: string): Promise<LessonRow[]> {
  const db = await getDb();
  return (await db.all<Row>("SELECT * FROM lessons WHERE date >= ? AND date <= ? ORDER BY date", [from, to])).map(toLesson);
}

/** Ids of fallback dialogues already used (to rotate through them). */
export async function usedDialogueIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.all<{ json: string }>("SELECT json FROM lessons WHERE kind = 'daily' AND source = 'fallback' ORDER BY date");
  return rows.map((r) => (JSON.parse(r.json) as { dialogueId?: string }).dialogueId).filter((x): x is string => !!x);
}
