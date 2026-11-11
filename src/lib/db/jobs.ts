import { getDb } from "./index";

export type JobStatus = "running" | "ok" | "fallback" | "error" | "skipped";
export type JobTrigger = "scheduler" | "catch-up" | "manual";

export interface JobRun {
  id: number;
  kind: string;
  trigger: JobTrigger;
  startedAt: string;
  finishedAt: string | null;
  status: JobStatus;
  message: string | null;
}

export function startJob(kind: string, trigger: JobTrigger): number {
  return Number(
    getDb()
      .prepare("INSERT INTO job_runs (kind, trigger, started_at, status) VALUES (?, ?, ?, 'running')")
      .run(kind, trigger, new Date().toISOString()).lastInsertRowid,
  );
}

export function finishJob(id: number, status: Exclude<JobStatus, "running">, message?: string) {
  getDb()
    .prepare("UPDATE job_runs SET finished_at = ?, status = ?, message = ? WHERE id = ?")
    .run(new Date().toISOString(), status, message?.slice(0, 1000) ?? null, id);
}

/** Is a job of this kind running (started within the last 15 minutes)? */
export function isJobRunning(kind: string): boolean {
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const r = getDb()
    .prepare("SELECT COUNT(*) AS n FROM job_runs WHERE kind = ? AND status = 'running' AND started_at >= ?")
    .get(kind, since) as { n: number };
  return r.n > 0;
}

export function recentJobs(limit = 10): JobRun[] {
  const rows = getDb().prepare("SELECT * FROM job_runs ORDER BY id DESC LIMIT ?").all(limit) as {
    id: number;
    kind: string;
    trigger: JobTrigger;
    started_at: string;
    finished_at: string | null;
    status: JobStatus;
    message: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    trigger: r.trigger,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    status: r.status,
    message: r.message,
  }));
}
