/**
 * SM-2 (Anki-flavoured) spaced repetition. Pure functions.
 *
 * Grades: again | hard | good | easy.
 * State: ease (≥ 1.3), interval (days), repetitions, lapses, due.
 */
import type { CheckResult } from "@/lib/turkish/answer";

export type Grade = "again" | "hard" | "good" | "easy";
export const GRADES: Grade[] = ["again", "hard", "good", "easy"];

export interface SrsState {
  ease: number;
  interval: number; // days
  repetitions: number;
  lapses: number;
}

export const NEW_CARD_STATE: SrsState = { ease: 2.5, interval: 0, repetitions: 0, lapses: 0 };
export const MIN_EASE = 1.3;
export const LEECH_LAPSES = 6;
/** A card counts as "learned" (unlocks the TR → EN direction) after this many successful reviews. */
export const LEARNED_REPETITIONS = 3;

export interface ScheduleResult extends SrsState {
  /** Minutes until due for same-day relearning, otherwise 0 and use `interval` days. */
  dueInMinutes: number;
  isLeech: boolean;
}

/** SM-2 quality for each grade (0–5 scale). */
const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function schedule(state: SrsState, grade: Grade): ScheduleResult {
  const q = QUALITY[grade];
  let { ease, interval, repetitions, lapses } = state;

  // Standard SM-2 ease update, clamped.
  ease = Math.max(MIN_EASE, +(ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))).toFixed(3));

  if (grade === "again") {
    if (repetitions > 0) lapses += 1;
    repetitions = 0;
    interval = 0;
    return { ease, interval, repetitions, lapses, dueInMinutes: 10, isLeech: lapses >= LEECH_LAPSES };
  }

  if (repetitions === 0) {
    interval = grade === "easy" ? 4 : grade === "hard" ? 1 : 1;
  } else if (repetitions === 1) {
    interval = grade === "easy" ? 7 : grade === "hard" ? 3 : 6;
  } else {
    const factor = grade === "hard" ? 1.2 : grade === "easy" ? ease * 1.3 : ease;
    interval = Math.max(interval + 1, Math.round(interval * factor));
  }
  repetitions += 1;
  interval = Math.min(interval, 365);
  return { ease, interval, repetitions, lapses, dueInMinutes: 0, isLeech: lapses >= LEECH_LAPSES };
}

/**
 * Suggest a grade from correctness and response time. The learner can override.
 * Time budget scales with answer length (typing takes longer for phrases).
 */
export function suggestGrade(result: CheckResult, msTaken: number, answerLength: number): Grade {
  if (result === "wrong") return "again";
  if (result === "almost") return "hard";
  const budget = 4000 + answerLength * 350; // ms
  if (msTaken <= budget * 0.5) return "easy";
  if (msTaken <= budget * 1.6) return "good";
  return "hard";
}

/** Compute the due timestamp (ms since epoch) for a schedule result. */
export function dueAt(result: ScheduleResult, now = Date.now()): number {
  if (result.dueInMinutes > 0) return now + result.dueInMinutes * 60_000;
  // Due at 03:00 local-ish boundary isn't needed — reviews are due "from this moment + N days".
  return now + result.interval * 86_400_000 - 60 * 60_000; // an hour of slack so daily reviews line up
}

/** Preview the next interval for each grade (shown on the grade buttons). */
export function previewIntervals(state: SrsState): Record<Grade, string> {
  const out = {} as Record<Grade, string>;
  for (const g of GRADES) {
    const r = schedule(state, g);
    out[g] = r.dueInMinutes ? `${r.dueInMinutes}m` : r.interval >= 30 ? `${Math.round(r.interval / 30)}mo` : `${r.interval}d`;
  }
  return out;
}
