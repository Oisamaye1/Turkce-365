/**
 * The "AI helper" that runs on your computer (where `claude -p` and your Pro login live).
 * Every 15 minutes (cron / Task Scheduler) it:
 *   1. creates today's lesson with Claude after 05:30 — or upgrades an offline lesson the
 *      online app/cron made while the computer was off (only if you haven't started it yet);
 *   2. corrects writing you submitted from the online app (cards land in today's reviews);
 *   3. rewrites locally-generated weekly report notes with Claude.
 */
import { setSetting, getSettings } from "@/lib/db/settings";
import { countJobs } from "@/lib/db/jobs";
import { getLesson } from "@/lib/db/lessons";
import { pendingWritings } from "@/lib/db/writing";
import { claudeEnabled, detectClaude } from "@/lib/claude/cli";
import { correctWriting } from "@/lib/lesson/correct";
import { ensureTodayLesson, type GenerateResult } from "@/lib/lesson/generate";
import { upgradeReportNarratives } from "@/lib/lesson/weekly";
import { localDate, startOfLocalDayIso } from "@/lib/time";

export interface WorkerSummary {
  claude: boolean;
  lesson: GenerateResult | null;
  upgraded: boolean;
  corrected: number;
  correctionErrors: number;
  reports: number;
}

export async function runWorker(log: (m: string) => void = () => {}): Promise<WorkerSummary> {
  await setSetting("worker_last_seen", new Date().toISOString());
  const caps = claudeEnabled() ? await detectClaude() : null;
  const claude = !!caps?.available;
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
