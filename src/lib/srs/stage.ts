/**
 * The learner's stage (1–6) for pacing exercises: from the plan when there is one,
 * otherwise from how many words they've met.
 */
import { getDb } from "@/lib/db";
import { currentPlanDay, getPlan } from "@/lib/db/plan";
import { PLAN_DAYS, planDay } from "@/lib/plan/build";

export async function learnerStage(): Promise<number> {
  const plan = await getPlan();
  if (plan) {
    const day = Math.min((await currentPlanDay(plan)) ?? plan.startDay, PLAN_DAYS);
    return planDay(day).stage.id;
  }
  const db = await getDb();
  const r = await db.one<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM reviews r JOIN cards c ON c.id = r.card_id WHERE r.direction = 'en-tr' AND c.source = 'seed'",
  );
  const n = Number(r?.n ?? 0);
  return n < 100 ? 1 : n < 300 ? 2 : n < 650 ? 3 : n < 1000 ? 4 : n < 1300 ? 5 : 6;
}

export interface PoolWord {
  id: number;
  tr: string;
  en: string;
  pos: string;
  unit: number;
}

/**
 * Words to draw wrong answers and extra tiles from: the learner's recent words plus the
 * next few they'll meet, so options look plausible but stay within what they've seen.
 */
export async function exercisePool(limit = 220): Promise<PoolWord[]> {
  const db = await getDb();
  const rows = await db.all<PoolWord>(
    `SELECT c.id, c.tr, c.en, c.pos, c.unit FROM cards c
     WHERE c.source = 'seed' AND c.seq <= COALESCE(
       (SELECT MAX(c2.seq) FROM cards c2 JOIN reviews r ON r.card_id = c2.id WHERE c2.source = 'seed'), 0) + 40
     ORDER BY c.seq DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({ ...r, id: Number(r.id), unit: Number(r.unit) }));
}
