/**
 * Read-only summary of one learner, for the admin dashboard. Runs inside that learner's
 * schema via runAsUser, reusing the same stats code the learner's own pages use.
 */
import { countDue } from "@/lib/db/cards";
import { recentJobs, type JobRun } from "@/lib/db/jobs";
import { countCompletedDays, currentPlanDay, getPlan } from "@/lib/db/plan";
import { getSettings } from "@/lib/db/settings";
import { activeDates, dailyActivity, streak, totals, type DayActivity } from "@/lib/db/stats";
import { getDb } from "@/lib/db";
import { PLAN_DAYS, planDay } from "@/lib/plan/build";
import { runAsUser } from "@/lib/users/context";
import type { AppUser } from "@/lib/users/types";

export interface LearnerSnapshot {
  streak: number;
  bestStreak: number;
  activeToday: boolean;
  lastActive: string | null;
  wordsMet: number;
  wordsMature: number;
  reviewsTotal: number;
  reviewsDue: number;
  lessonsDone: number;
  writings: number;
  writingsWaiting: number;
  plan: { day: number; daysDone: number; week: number; stage: string; title: string; startedOn: string } | null;
  timezone: string;
  error?: string;
}

export async function learnerSnapshot(user: AppUser): Promise<LearnerSnapshot> {
  return runAsUser(user, async () => {
    try {
      const [st, t, due, dates, settings, plan] = await Promise.all([streak(), totals(), countDue(), activeDates(), getSettings(), getPlan()]);
      const db = await getDb();
      const w = await db.one<{ n: number; waiting: number }>(
        "SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE corrected_json IS NULL)::int AS waiting FROM writings",
      );
      let planInfo: LearnerSnapshot["plan"] = null;
      if (plan) {
        const cur = Math.min((await currentPlanDay(plan)) ?? plan.startDay, PLAN_DAYS);
        const pd = planDay(cur);
        planInfo = { day: cur, daysDone: await countCompletedDays(), week: pd.week, stage: pd.stage.title, title: pd.title, startedOn: plan.startedOn };
      }
      const last = [...dates].sort().at(-1) ?? null;
      return {
        streak: st.current,
        bestStreak: st.best,
        activeToday: st.activeToday,
        lastActive: last,
        wordsMet: t.introduced,
        wordsMature: t.mature,
        reviewsTotal: t.reviewsTotal,
        reviewsDue: due.due,
        lessonsDone: t.lessonsDone,
        writings: Number(w?.n ?? 0),
        writingsWaiting: Number(w?.waiting ?? 0),
        plan: planInfo,
        timezone: settings.timezone,
      };
    } catch (e) {
      return {
        streak: 0, bestStreak: 0, activeToday: false, lastActive: null, wordsMet: 0, wordsMature: 0, reviewsTotal: 0, reviewsDue: 0,
        lessonsDone: 0, writings: 0, writingsWaiting: 0, plan: null, timezone: "",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });
}

export async function learnerActivity(user: AppUser, days = 28): Promise<{ activity: DayActivity[]; jobs: JobRun[] }> {
  return runAsUser(user, async () => ({ activity: await dailyActivity(days), jobs: await recentJobs(8) }));
}
