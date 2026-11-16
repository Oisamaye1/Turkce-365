/**
 * Learning-plan progress. The plan itself is computed (lib/plan/build); only the
 * configuration (settings key "plan") and per-day ticks / completion are stored.
 */
import { PLAN_DAYS, stepsIntroducedBy } from "@/lib/plan/build";
import { getDb } from "./index";
import { getSetting, setSetting } from "./settings";

export interface PlanConfig {
  /** First plan day (later than 1 when the learner skipped what they knew). */
  startDay: number;
  /** Date the plan was created (local). */
  startedOn: string;
  /** Planned study days per week (for the finish-date estimate). */
  daysPerWeek: number;
  createdAt: string;
}

export type Ticks = Partial<Record<string, string>>;

export interface PlanDayRow {
  day: number;
  ticks: Ticks;
  completedAt: string | null;
  completedOn: string | null;
}

export async function getPlan(): Promise<PlanConfig | null> {
  const raw = await getSetting("plan");
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as PlanConfig;
    return p && typeof p.startDay === "number" ? p : null;
  } catch {
    return null;
  }
}

export async function savePlan(cfg: Omit<PlanConfig, "createdAt">, opts: { reset?: boolean } = {}): Promise<PlanConfig> {
  const db = await getDb();
  const full: PlanConfig = { ...cfg, startDay: Math.max(1, Math.min(PLAN_DAYS, Math.floor(cfg.startDay))), createdAt: new Date().toISOString() };
  if (opts.reset) await db.run("DELETE FROM plan_days");
  await setSetting("plan", JSON.stringify(full));
  await unlockPlanSteps(full.startDay);
  return full;
}

export async function deletePlan() {
  const db = await getDb();
  await db.run("DELETE FROM plan_days");
  await db.run("DELETE FROM settings WHERE key = 'plan'");
}

function toRow(r: { day: number; ticks: string; completed_at: string | null; completed_on: string | null }): PlanDayRow {
  let ticks: Ticks = {};
  try {
    ticks = JSON.parse(r.ticks || "{}");
  } catch {
    ticks = {};
  }
  return { day: Number(r.day), ticks, completedAt: r.completed_at, completedOn: r.completed_on };
}

export async function getPlanRows(): Promise<Map<number, PlanDayRow>> {
  const db = await getDb();
  const rows = await db.all<{ day: number; ticks: string; completed_at: string | null; completed_on: string | null }>(
    "SELECT day, ticks, completed_at, completed_on FROM plan_days ORDER BY day",
  );
  return new Map(rows.map((r) => [Number(r.day), toRow(r)]));
}

export async function getPlanRow(day: number): Promise<PlanDayRow> {
  const db = await getDb();
  const r = await db.one<{ day: number; ticks: string; completed_at: string | null; completed_on: string | null }>(
    "SELECT day, ticks, completed_at, completed_on FROM plan_days WHERE day = ?",
    [day],
  );
  return r ? toRow(r) : { day, ticks: {}, completedAt: null, completedOn: null };
}

/** The first day from the start that isn't finished: the day to do now. */
export async function currentPlanDay(cfg?: PlanConfig | null): Promise<number | null> {
  const plan = cfg === undefined ? await getPlan() : cfg;
  if (!plan) return null;
  const db = await getDb();
  const r = await db.one<{ d: number | null }>(
    `SELECT MIN(n)::int AS d FROM generate_series(?::int, ?::int) AS n
     WHERE NOT EXISTS (SELECT 1 FROM plan_days p WHERE p.day = n AND p.completed_at IS NOT NULL)`,
    [plan.startDay, PLAN_DAYS],
  );
  return r?.d == null ? PLAN_DAYS + 1 : Number(r.d);
}

export async function countCompletedDays(): Promise<number> {
  const db = await getDb();
  const r = await db.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM plan_days WHERE completed_at IS NOT NULL");
  return Number(r?.n ?? 0);
}

/** Set (or clear, with null) one tick on a day. */
export async function setTick(day: number, key: string, value: string | null): Promise<PlanDayRow> {
  const db = await getDb();
  return db.tx(async (t) => {
    const r = await t.one<{ ticks: string }>("SELECT ticks FROM plan_days WHERE day = ? FOR UPDATE", [day]);
    let ticks: Ticks = {};
    try {
      ticks = JSON.parse(r?.ticks ?? "{}");
    } catch {
      ticks = {};
    }
    if (value === null) delete ticks[key];
    else ticks[key] = value;
    await t.run(
      `INSERT INTO plan_days (day, ticks) VALUES (?, ?) ON CONFLICT (day) DO UPDATE SET ticks = excluded.ticks`,
      [day, JSON.stringify(ticks)],
    );
    const row = await t.one<{ day: number; ticks: string; completed_at: string | null; completed_on: string | null }>(
      "SELECT day, ticks, completed_at, completed_on FROM plan_days WHERE day = ?",
      [day],
    );
    return toRow(row!);
  });
}

export async function completeDay(day: number, localDate: string, now = new Date()) {
  const db = await getDb();
  await db.run(
    `INSERT INTO plan_days (day, completed_at, completed_on) VALUES (?, ?, ?)
     ON CONFLICT (day) DO UPDATE SET completed_at = COALESCE(plan_days.completed_at, excluded.completed_at),
       completed_on = COALESCE(plan_days.completed_on, excluded.completed_on)`,
    [day, now.toISOString(), localDate],
  );
  // The next day may introduce a new suffix step: make sure it's open in the gym.
  await unlockPlanSteps(Math.min(PLAN_DAYS, day + 1));
}

export async function reopenDay(day: number) {
  const db = await getDb();
  await db.run("UPDATE plan_days SET completed_at = NULL, completed_on = NULL WHERE day = ?", [day]);
}

/** Plan days finished on a given local date. */
export async function daysCompletedOn(localDate: string): Promise<number[]> {
  const db = await getDb();
  const rows = await db.all<{ day: number }>("SELECT day FROM plan_days WHERE completed_on = ? ORDER BY day", [localDate]);
  return rows.map((r) => Number(r.day));
}

/** Unlock every suffix step the plan has introduced by `day`. */
export async function unlockPlanSteps(day: number) {
  const db = await getDb();
  const now = new Date().toISOString();
  for (const s of stepsIntroducedBy(day)) {
    await db.run(
      `INSERT INTO grammar_progress (step_id, unlocked_at) VALUES (?, ?)
       ON CONFLICT (step_id) DO UPDATE SET unlocked_at = COALESCE(grammar_progress.unlocked_at, excluded.unlocked_at)`,
      [s, now],
    );
  }
}
