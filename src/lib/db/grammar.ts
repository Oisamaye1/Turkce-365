import { getDb, type DB } from "./index";
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

async function ensureFirstStep(db: DB) {
  await db.run("INSERT INTO grammar_progress (step_id, unlocked_at) VALUES (1, ?) ON CONFLICT (step_id) DO NOTHING", [new Date().toISOString()]);
}

const SCORE = `CASE result WHEN 'correct' THEN 1.0 WHEN 'almost' THEN 0.5 ELSE 0 END`;

export async function getStepStatuses(): Promise<StepStatus[]> {
  const db = await getDb();
  await ensureFirstStep(db);
  const rows = await db.all<{ step_id: number; unlocked_at: string | null; attempts: number; correct: number }>(
    "SELECT step_id, unlocked_at, attempts, correct FROM grammar_progress",
  );
  const recent = await db.all<{ step_id: number; n: number; score: number }>(
    `SELECT step_id, COUNT(*)::int AS n, SUM(${SCORE})::float8 AS score FROM (
       SELECT step_id, result, ROW_NUMBER() OVER (PARTITION BY step_id ORDER BY id DESC) AS rn FROM gym_log
     ) x WHERE rn <= ? GROUP BY step_id`,
    [UNLOCK_WINDOW],
  );
  const byId = new Map(rows.map((r) => [Number(r.step_id), r]));
  const rec = new Map(recent.map((r) => [Number(r.step_id), { count: Number(r.n), accuracy: Number(r.n) ? Number(r.score) / Number(r.n) : 0 }]));
  return GRAMMAR_STEPS.map((s) => {
    const r = byId.get(s.id);
    const x = rec.get(s.id) ?? { count: 0, accuracy: 0 };
    return {
      stepId: s.id,
      unlocked: !!r?.unlocked_at,
      unlockedAt: r?.unlocked_at ?? null,
      attempts: Number(r?.attempts ?? 0),
      correct: Number(r?.correct ?? 0),
      mastery: x.accuracy,
      recentCount: x.count,
      mastered: x.count >= UNLOCK_WINDOW && x.accuracy >= UNLOCK_ACCURACY,
    };
  });
}

/** Accuracy over the last 20 drills of a step ("almost" counts as half). */
export async function recentAccuracy(stepId: number, dbIn?: DB): Promise<{ accuracy: number; count: number }> {
  const db = dbIn ?? (await getDb());
  const r = await db.one<{ n: number; score: number }>(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(${SCORE}), 0)::float8 AS score FROM (
       SELECT result FROM gym_log WHERE step_id = ? ORDER BY id DESC LIMIT ?
     ) x`,
    [stepId, UNLOCK_WINDOW],
  );
  const n = Number(r?.n ?? 0);
  return { accuracy: n ? Number(r!.score) / n : 0, count: n };
}

/** Highest unlocked step — the learner's "current grammar step". */
export async function currentGrammarStep(): Promise<number> {
  const db = await getDb();
  await ensureFirstStep(db);
  const r = await db.one<{ s: number | null }>("SELECT MAX(step_id) AS s FROM grammar_progress WHERE unlocked_at IS NOT NULL");
  return Number(r?.s ?? 1);
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
export async function recordDrill(input: DrillAnswerInput, now = new Date()): Promise<{ unlocked: number | null; mastery: number }> {
  const db = await getDb();
  await ensureFirstStep(db);
  return db.tx(async (t) => {
    await t.run(
      `INSERT INTO gym_log (step_id, timestamp, result, answer_given, expected, prompt, rules, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.stepId, now.toISOString(), input.result, input.answer, input.expected, input.prompt, JSON.stringify(input.rules), input.context ?? "gym"],
    );
    await t.run(
      `INSERT INTO grammar_progress (step_id, attempts, correct) VALUES (?, 1, ?)
       ON CONFLICT (step_id) DO UPDATE SET attempts = grammar_progress.attempts + 1, correct = grammar_progress.correct + excluded.correct`,
      [input.stepId, input.result === "correct" ? 1 : 0],
    );
    const { accuracy, count } = await recentAccuracy(input.stepId, t);
    await t.run("UPDATE grammar_progress SET mastery = ? WHERE step_id = ?", [accuracy, input.stepId]);
    let unlocked: number | null = null;
    if (count >= UNLOCK_WINDOW && accuracy >= UNLOCK_ACCURACY && input.stepId < MAX_STEP) {
      const next = input.stepId + 1;
      const already = await t.one<{ unlocked_at: string | null }>("SELECT unlocked_at FROM grammar_progress WHERE step_id = ?", [next]);
      if (!already?.unlocked_at) {
        await t.run(
          `INSERT INTO grammar_progress (step_id, unlocked_at) VALUES (?, ?)
           ON CONFLICT (step_id) DO UPDATE SET unlocked_at = excluded.unlocked_at`,
          [next, now.toISOString()],
        );
        unlocked = next;
      }
    }
    return { unlocked, mastery: accuracy };
  });
}

/** Manually unlock steps 1..stepId (Settings → "I already know this"). */
export async function unlockStepsUpTo(stepId: number) {
  const db = await getDb();
  for (let s = 1; s <= stepId; s++) {
    await db.run(
      `INSERT INTO grammar_progress (step_id, unlocked_at) VALUES (?, ?)
       ON CONFLICT (step_id) DO UPDATE SET unlocked_at = COALESCE(grammar_progress.unlocked_at, excluded.unlocked_at)`,
      [s, new Date().toISOString()],
    );
  }
}

/** Accuracy per step in a time window (weekly report). */
export async function stepAccuracySince(sinceIso: string, untilIso = "9999"): Promise<{ stepId: number; attempts: number; accuracy: number }[]> {
  const db = await getDb();
  const rows = await db.all<{ step_id: number; n: number; score: number }>(
    `SELECT step_id, COUNT(*)::int AS n, SUM(${SCORE})::float8 AS score
     FROM gym_log WHERE timestamp >= ? AND timestamp < ? GROUP BY step_id ORDER BY step_id`,
    [sinceIso, untilIso],
  );
  return rows.map((r) => ({ stepId: Number(r.step_id), attempts: Number(r.n), accuracy: Number(r.n) ? Number(r.score) / Number(r.n) : 0 }));
}
