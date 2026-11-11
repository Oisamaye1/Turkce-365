import { getDb } from "./index";
import type { StoredLesson } from "@/lib/lesson/schema";

export interface LessonRow {
  date: string;
  kind: "daily" | "weekly";
  source: "claude" | "fallback";
  lesson: StoredLesson;
  progress: LessonProgress;
  createdAt: string;
  completedAt: string | null;
}

export interface LessonProgress {
  /** Index of the section the learner is on. */
  section: number;
  phrasesAdded?: boolean;
  warmup?: { correct: number; total: number };
  drills?: { correct: number; total: number };
  writingId?: number;
  quiz?: { vocab?: { correct: number; total: number }; drills?: { correct: number; total: number }; translation?: string };
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
  createdAt: r.created_at,
  completedAt: r.completed_at,
});

export function getLesson(date: string): LessonRow | null {
  const r = getDb().prepare("SELECT * FROM lessons WHERE date = ?").get(date) as Row | undefined;
  return r ? toLesson(r) : null;
}

export function saveLesson(lesson: StoredLesson) {
  getDb()
    .prepare(
      `INSERT INTO lessons (date, kind, source, json) VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET kind = excluded.kind, source = excluded.source, json = excluded.json,
         progress = NULL, completed_at = NULL, created_at = datetime('now')`,
    )
    .run(lesson.date, lesson.kind, lesson.source, JSON.stringify(lesson));
}

export function saveProgress(date: string, progress: LessonProgress) {
  getDb().prepare("UPDATE lessons SET progress = ? WHERE date = ?").run(JSON.stringify(progress), date);
}

export function completeLesson(date: string) {
  getDb().prepare("UPDATE lessons SET completed_at = COALESCE(completed_at, ?) WHERE date = ?").run(new Date().toISOString(), date);
}

export function listLessons(limit = 30): LessonRow[] {
  return (getDb().prepare("SELECT * FROM lessons ORDER BY date DESC LIMIT ?").all(limit) as Row[]).map(toLesson);
}

export function lessonsBetween(from: string, to: string): LessonRow[] {
  return (getDb().prepare("SELECT * FROM lessons WHERE date >= ? AND date <= ? ORDER BY date").all(from, to) as Row[]).map(toLesson);
}

export function countLessons(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM lessons WHERE kind = 'daily'").get() as { n: number }).n;
}

/** Ids of fallback dialogues already used (to rotate through them). */
export function usedDialogueIds(): string[] {
  const rows = getDb().prepare("SELECT json FROM lessons WHERE kind = 'daily' AND source = 'fallback' ORDER BY date").all() as { json: string }[];
  return rows.map((r) => (JSON.parse(r.json) as { dialogueId?: string }).dialogueId).filter((x): x is string => !!x);
}
