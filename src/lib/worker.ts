/**
 * The "AI helper" that runs on your computer (where `claude -p` and your Pro login live).
 * Every 6 hours from the lesson time, and at logon (cron / Task Scheduler), it:
 *   1. creates today's lesson with Claude after 05:30 — or upgrades an offline lesson the
 *      online app/cron made while the computer was off (only if you haven't started it yet);
 *   2. corrects writing you submitted from the online app (cards land in today's reviews);
 *   3. rewrites locally-generated weekly report notes with Claude.
 */
import { setSetting, getSettings } from "@/lib/db/settings";
import { runAsUser } from "@/lib/users/context";
import { activeUsers } from "@/lib/users/store";
import { countJobs } from "@/lib/db/jobs";
import { getLesson } from "@/lib/db/lessons";
import { pendingWritings } from "@/lib/db/writing";
import { claudeEnabled, detectClaude } from "@/lib/claude/cli";
import { correctWriting } from "@/lib/lesson/correct";
import { ensureTodayLesson, type GenerateResult } from "@/lib/lesson/generate";
import { upgradeReportNarratives } from "@/lib/lesson/weekly";
import { localDate, startOfLocalDayIso } from "@/lib/time";

export interface WorkerSummary {
  /** Learners processed. */
  learners?: number;
  claude: boolean;
  lesson: GenerateResult | null;
  upgraded: boolean;
  corrected: number;
  correctionErrors: number;
  reports: number;
}

/**
 * Run for every active learner. Claude is used only for learners whose account has it on;
 * the others still get today's offline lesson. Totals are summed across learners.
 */
export async function runWorker(log: (m: string) => void = () => {}): Promise<WorkerSummary> {
  const caps = claudeEnabled() ? await detectClaude() : null;
  const users = await activeUsers();
  const total: WorkerSummary = { learners: users.length, claude: !!caps?.available, lesson: null, upgraded: false, corrected: 0, correctionErrors: 0, reports: 0 };
  if (!users.length) {
    // Not set up yet (no accounts): work on the original learner's data.
    return runWorkerForLearner(!!caps?.available, caps?.error, log);
  }
  for (const u of users) {
    const s = await runAsUser(u, () =>
      runWorkerForLearner(!!caps?.available && u.aiEnabled, caps?.available && !u.aiEnabled ? "turned off for this learner" : caps?.error, (m) => log(`[${u.username}] ${m}`)),
    ).catch((e) => {
      log(`[${u.username}] failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    });
    if (!s) continue;
    if (u.role === "admin" || !total.lesson) total.lesson = s.lesson;
    total.upgraded ||= s.upgraded;
    total.corrected += s.corrected;
    total.correctionErrors += s.correctionErrors;
    total.reports += s.reports;
  }
  return total;
}

async function runWorkerForLearner(claude: boolean, why: string | undefined, log: (m: string) => void): Promise<WorkerSummary> {
  await setSetting("worker_last_seen", new Date().toISOString());
  const caps = { error: why };
  const summary: WorkerSummary = { claude, lesson: null, upgraded: false, corrected: 0, correctionErrors: 0, reports: 0 };

  // 1. Today's lesson
  const lesson = await ensureTodayLesson({ trigger: "worker", useClaude: claude });
  summary.lesson = lesson;
  log(`lesson: ${lesson.status} — ${lesson.message}`);
  if (claude && lesson.status === "exists") {
    const { timezone } = await getSettings();
    const date = localDate(new Date(), timezone);
    const row = await getLesson(date);
    const failuresToday = await countJobs("lesson", startOfLocalDayIso(date, timezone), ["fallback", "error"]);
    if (row && row.kind === "daily" && row.source === "fallback" && !row.started && failuresToday < 3) {
      const up = await ensureTodayLesson({ trigger: "worker", force: true, useClaude: true });
      summary.upgraded = up.source === "claude";
      summary.lesson = up;
      log(`upgrade offline lesson → ${up.source}: ${up.message}`);
    }
  }

  // 2. Writing corrections queued from the online app
  if (claude) {
    for (const w of await pendingWritings()) {
      const r = await correctWriting(w.id);
      if (r.correction) summary.corrected++;
      else summary.correctionErrors++;
      log(`writing #${w.id}: ${r.correction ? `corrected (${r.cardsAdded} cards)` : r.error}`);
    }
    // 3. Weekly report notes
    summary.reports = await upgradeReportNarratives();
    if (summary.reports) log(`weekly report notes rewritten by Claude: ${summary.reports}`);
  } else {
    log(`Claude unavailable${caps?.error ? `: ${caps.error}` : ""} — nothing to upgrade.`);
  }
  return summary;
}
