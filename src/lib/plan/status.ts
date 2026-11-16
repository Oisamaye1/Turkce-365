/**
 * Live status of a plan day's tasks. Reviews, the lesson, drills, writing and the mission
 * are detected from what the learner actually did today; the rest are ticked by hand.
 * Any task can also be ticked by hand (e.g. done outside the app).
 */
import { countDue } from "@/lib/db/cards";
import { getDb } from "@/lib/db/index";
import { getLesson } from "@/lib/db/lessons";
import { ensureMission } from "@/lib/db/missions";
import { getPlan, getPlanRow, currentPlanDay, type PlanConfig, type PlanDayRow } from "@/lib/db/plan";
import { getSettings, today } from "@/lib/db/settings";
import { startOfLocalDayIso } from "@/lib/time";
import { planDay, type PlanDay, type TaskKind } from "./build";

export const DRILLS_PER_DAY = 10;

export interface TaskState {
  key: TaskKind;
  done: boolean;
  /** "auto" when detected from activity, "manual" when ticked, null when open. */
  how: "auto" | "manual" | null;
  /** Stored value for choice tasks (challenge: done/skipped, selfcheck: yes/mostly/notyet). */
  value?: string;
  /** Progress text for auto tasks, e.g. "4 of 10 drills". */
  progress?: string;
}

export interface PlanDayView {
  plan: PlanConfig;
  day: PlanDay;
  row: PlanDayRow;
  current: number;
  isCurrent: boolean;
  tasks: TaskState[];
  canFinish: boolean;
  doneCount: number;
  requiredCount: number;
}

async function drillsToday(stepId: number): Promise<number> {
  const s = await getSettings();
  const since = startOfLocalDayIso(await today(), s.timezone);
  const db = await getDb();
  const r = await db.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM gym_log WHERE step_id = ? AND timestamp >= ?", [stepId, since]);
  return Number(r?.n ?? 0);
}

async function writingToday(): Promise<boolean> {
  const db = await getDb();
  const r = await db.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM writings WHERE date = ?", [await today()]);
  return Number(r?.n ?? 0) > 0;
}

export async function getPlanDayView(dayNo?: number): Promise<PlanDayView | null> {
  const plan = await getPlan();
  if (!plan) return null;
  const current = (await currentPlanDay(plan)) ?? plan.startDay;
  const n = dayNo ?? Math.min(current, 365);
  const day = planDay(n);
  const row = await getPlanRow(day.day);
  const isCurrent = day.day === current;
  const completed = !!row.completedAt;
  const date = await today();

  const tasks: TaskState[] = [];
  for (const t of day.tasks) {
    const tick = row.ticks[t.key];
    const st: TaskState = { key: t.key, done: false, how: null, value: tick };
    if (completed) {
      st.done = true;
      st.how = tick ? "manual" : "auto";
    } else if (tick) {
      st.done = tick !== "open";
      st.how = "manual";
    } else if (isCurrent && !t.manual) {
      // Activity detection only makes sense for the day being done now.
      if (t.key === "reviews") {
        const d = await countDue();
        const left = d.due + d.fresh;
        st.done = left === 0;
        st.progress = left ? `${left} left` : undefined;
      } else if (t.key === "lesson") {
        const l = await getLesson(date);
        st.done = !!l?.completedAt;
        if (!st.done && l) st.progress = "In progress";
      } else if (t.key === "drills") {
        const n = await drillsToday(day.step);
        st.done = n >= DRILLS_PER_DAY;
        st.progress = n && !st.done ? `${n} of ${DRILLS_PER_DAY}` : undefined;
      } else if (t.key === "write") {
        st.done = await writingToday();
      } else if (t.key === "mission") {
        st.done = (await ensureMission(date)).status !== "active";
      }
      if (st.done) st.how = "auto";
    }
    tasks.push(st);
  }
  const required = day.tasks.filter((t) => !t.optional).map((t) => t.key);
  const doneCount = tasks.filter((t) => required.includes(t.key) && t.done).length;
  return {
    plan,
    day,
    row,
    current,
    isCurrent,
    tasks,
    canFinish: isCurrent && !completed && doneCount === required.length,
    doneCount,
    requiredCount: required.length,
  };
}
