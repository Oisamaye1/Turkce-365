import { getDb } from "./index";

const TABLES = ["settings", "cards", "reviews", "review_log", "grammar_progress", "gym_log", "lessons", "writings", "mistakes", "missions", "weekly_reports", "job_runs"];

/** Full JSON export of every table (portable backup). */
export async function exportAllJson(): Promise<Record<string, unknown>> {
  const db = await getDb();
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), app: "turkce-365", schema: 2 };
  for (const t of TABLES) out[t] = await db.all(`SELECT * FROM ${t}`);
  return out;
}
