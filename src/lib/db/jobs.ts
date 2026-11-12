import { getDb } from "./index";

export type JobStatus = "running" | "ok" | "fallback" | "error" | "skipped";
export type JobTrigger = "scheduler" | "catch-up" | "manual" | "worker" | "cron";

export interface JobRun {
  id: number;
  kind: string;
  trigger: JobTrigger;
  startedAt: string;
  finishedAt: string | null;
  status: JobStatus;
  message: string | null;
}

export async function startJob(kind: string, trigger: JobTrigger): Promise<number> {
  const db = await getDb();
  const r = await db.one<{ id: number }>("INSERT INTO job_runs (kind, trigger, started_at, status) VALUES (?, ?, ?, 'running') RETURNING id", [
    kind,
    trigger,
    new Date().toISOString(),
  ]);
  return Number(r!.id);
}

export async function finishJob(id: number, status: Exclude<JobStatus, "running">, message?: string) {
  const db = await getDb();
  await db.run("UPDATE job_runs SET finished_at = ?, status = ?, message = ? WHERE id = ?", [new Date().toISOString(), status, message?.slice(0, 1000) ?? null, id]);
}

/** Is a job of this kind running (started within the last 10 minutes)? */
export async function isJobRunning(kind: string): Promise<boolean> {
  const db = await getDb();
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const r = await db.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM job_runs WHERE kind = ? AND status = 'running' AND started_at >= ?", [kind, since]);
  return Number(r?.n) > 0;
}

/** How many jobs of a kind/trigger failed or fell back since a timestamp (limits retries). */
export async function countJobs(kind: string, sinceIso: string, statuses: JobStatus[]): Promise<number> {
  const db = await getDb();
  const r = await db.one<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM job_runs WHERE kind = ? AND started_at >= ? AND status IN (${statuses.map(() => "?").join(",")})`,
    [kind, sinceIso, ...statuses],
  );
  return Number(r?.n ?? 0);
}

export async function recentJobs(limit = 10): Promise<JobRun[]> {
  const db = await getDb();
  const rows = await db.all<{
    id: number;
    kind: string;
    trigger: JobTrigger;
    started_at: string;
    finished_at: string | null;
    status: JobStatus;
    message: string | null;
  }>("SELECT * FROM job_runs ORDER BY id DESC LIMIT ?", [limit]);
  return rows.map((r) => ({
    id: Number(r.id),
    kind: r.kind,
    trigger: r.trigger,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    status: r.status,
    message: r.message,
  }));
}

/** Last time the worker on the learner's computer checked in. */
export async function lastWorkerSeen(): Promise<string | null> {
  const db = await getDb();
  const r = await db.one<{ value: string }>("SELECT value FROM settings WHERE key = 'worker_last_seen'");
  return r?.value ?? null;
}
