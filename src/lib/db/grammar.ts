import { getDb } from "./index";
import { GRAMMAR_STEPS, MAX_STEP, UNLOCK_ACCURACY, UNLOCK_WINDOW } from "@/lib/grammar/steps";
import type { CheckResult } from "@/lib/turkish/answer";

export interface StepStatus {
  stepId: number;
  unlocked: boolean;
  unlockedAt: string | null;
  attempts: number;
  correct: number;
  /** Accuracy over the last 20 attempts (0–1). */
  mastery: number;
  recentCount: number;
  mastered: boolean;
}

function ensureFirstStep() {
  getDb()
    .prepare("INSERT OR IGNORE INTO grammar_progress (step_id, unlocked_at) VALUES (1, ?)")
    .run(new Date().toISOString());
}

export function getStepStatuses(): StepStatus[] {
  ensureFirstStep();
  const db = getDb();
  const rows = db.prepare("SELECT * FROM grammar_progress").all() as {
    step_id: number;
    unlocked_at: string | null;
    attempts: number;
    correct: number;
    mastery: number;
  }[];
  const byId = new Map(rows.map((r) => [r.step_id, r]));
  return GRAMMAR_STEPS.map((s) => {
    const r = byId.get(s.id);
    const recent = recentAccuracy(s.id);
    return {
      stepId: s.id,
      unlocked: !!r?.unlocked_at,
      unlockedAt: r?.unlocked_at ?? null,
      attempts: r?.attempts ?? 0,
      correct: r?.correct ?? 0,
      mastery: recent.accuracy,
      recentCount: recent.count,
      mastered: recent.count >= UNLOCK_WINDOW && recent.accuracy >= UNLOCK_ACCURACY,
    };
  });
}

/** Accuracy over the last 20 drills of a step ("almost" counts as half). */
export function recentAccuracy(stepId: number): { accuracy: number; count: number } {
  const rows = getDb()
    .prepare("SELECT result FROM gym_log WHERE step_id = ? ORDER BY id DESC LIMIT ?")
    .all(stepId, UNLOCK_WINDOW) as { result: CheckResult }[];
  if (!rows.length) return { accuracy: 0, count: 0 };
  const score = rows.reduce((s, r) => s + (r.result === "correct" ? 1 : r.result === "almost" ? 0.5 : 0), 0);
  return { accuracy: score / rows.length, count: rows.length };
}

/** Highest unlocked step — the learner's "current grammar step". */
export function currentGrammarStep(): number {
  ensureFirstStep();
  const r = getDb().prepare("SELECT MAX(step_id) AS s FROM grammar_progress WHERE unlocked_at IS NOT NULL").get() as { s: number | null };
  return r.s ?? 1;
}

export interface DrillAnswerInput {
  stepId: number;
  result: CheckResult;
  answer: string;
  expected: string;
  prompt: string;
  rules: string[];
  context?: "gym" | "lesson" | "quiz";
}

/** Log a drill answer; returns the step that was newly unlocked, if any. */
export function recordDrill(input: DrillAnswerInput, now = new Date()): { unlocked: number | null; mastery: number } {
  ensureFirstStep();
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO gym_log (step_id, timestamp, result, answer_given, expected, prompt, rules, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(input.stepId, now.toISOString(), input.result, input.answer, input.expected, input.prompt, JSON.stringify(input.rules), input.context ?? "gym");
    db.prepare(
      `INSERT INTO grammar_progress (step_id, attempts, correct) VALUES (?, 1, ?)
       ON CONFLICT(step_id) DO UPDATE SET attempts = attempts + 1, correct = correct + excluded.correct`,
    ).run(input.stepId, input.result === "correct" ? 1 : 0);
    const { accuracy, count } = recentAccuracy(input.stepId);
    db.prepare("UPDATE grammar_progress SET mastery = ? WHERE step_id = ?").run(accuracy, input.stepId);
    let unlocked: number | null = null;
    if (count >= UNLOCK_WINDOW && accuracy >= UNLOCK_ACCURACY && input.stepId < MAX_STEP) {
      const next = input.stepId + 1;
      const already = db.prepare("SELECT unlocked_at FROM grammar_progress WHERE step_id = ?").get(next) as
        | { unlocked_at: string | null }
        | undefined;
      if (!already?.unlocked_at) {
        db.prepare(
          `INSERT INTO grammar_progress (step_id, unlocked_at) VALUES (?, ?)
           ON CONFLICT(step_id) DO UPDATE SET unlocked_at = excluded.unlocked_at`,
        ).run(next, now.toISOString());
        unlocked = next;
      }
    }
    return { unlocked, mastery: accuracy };
  });
  return tx();
}

/** Manually unlock a step (Settings → "I already know this"). */
export function unlockStep(stepId: number) {
  getDb()
    .prepare(
      `INSERT INTO grammar_progress (step_id, unlocked_at) VALUES (?, ?)
       ON CONFLICT(step_id) DO UPDATE SET unlocked_at = COALESCE(unlocked_at, excluded.unlocked_at)`,
    )
    .run(stepId, new Date().toISOString());
}

/** Accuracy per step in a time window (weekly report). */
export function stepAccuracySince(sinceIso: string, untilIso?: string): { stepId: number; attempts: number; accuracy: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT step_id, COUNT(*) AS n,
              SUM(CASE result WHEN 'correct' THEN 1.0 WHEN 'almost' THEN 0.5 ELSE 0 END) AS score
       FROM gym_log WHERE timestamp >= ? AND timestamp < ? GROUP BY step_id ORDER BY step_id`,
    )
    .all(sinceIso, untilIso ?? "9999") as { step_id: number; n: number; score: number }[];
  return rows.map((r) => ({ stepId: r.step_id, attempts: r.n, accuracy: r.n ? r.score / r.n : 0 }));
}
