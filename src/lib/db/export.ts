import { getDb } from "./index";

const TABLES = ["settings", "cards", "reviews", "review_log", "grammar_progress", "gym_log", "lessons", "writings", "mistakes", "missions", "weekly_reports", "job_runs"];

/** Full JSON export of every table (portable backup). */
export function exportAllJson(): Record<string, unknown> {
  const db = getDb();
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), app: "turkce-365" };
  for (const t of TABLES) out[t] = db.prepare(`SELECT * FROM ${t}`).all();
  return out;
}
