/**
 * Database access — Postgres everywhere, two drivers:
 *   - DATABASE_URL set  → hosted Postgres (Supabase) via node-postgres (used on Vercel and by the
 *                          worker on your computer).
 *   - otherwise         → embedded PGlite stored in data/pglite (local-first, no server needed).
 * Same SQL in both. Server-only.
 */
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedIfEmpty } from "./seed";

export interface DB {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<void>;
  /** Multiple statements, no parameters. */
  exec(sql: string): Promise<void>;
  tx<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  kind: "postgres" | "pglite";
}

/** Write SQL with `?` placeholders; they become $1, $2… (no literal `?` inside SQL strings). */
export function numbered(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export function localDbDir(): string {
  return process.env.TURKCE_PGLITE_DIR ?? path.join(process.cwd(), "data", "pglite");
}

// ---------------------------------------------------------------- drivers

type PgQueryable = { query: (q: string, p?: unknown[]) => Promise<{ rows: unknown[] }> };

/**
 * Hosted Postgres via node-postgres. On Vercel the pool is registered with attachDatabasePool so
 * idle connections are released before a function instance is suspended (no half-finished
 * transactions left holding locks on the pooler).
 */
async function postgresDriver(url: string): Promise<DB> {
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: url,
    max: process.env.VERCEL ? 2 : 4,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 15_000,
    ssl: /supabase\.(co|com)/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  pool.on("error", () => {}); // a dropped idle client must not crash the process
  if (process.env.VERCEL) {
    const { attachDatabasePool } = await import("@vercel/functions");
    attachDatabasePool(pool);
  }
  const wrap = (q: PgQueryable): Omit<DB, "tx" | "close" | "kind"> => ({
    all: async <T,>(s: string, p: unknown[] = []) => (await q.query(numbered(s), p)).rows as T[],
    one: async <T,>(s: string, p: unknown[] = []) => (await q.query(numbered(s), p)).rows[0] as T | undefined,
    run: async (s: string, p: unknown[] = []) => {
      await q.query(numbered(s), p);
    },
    exec: async (s: string) => {
      await q.query(s);
    },
  });
  const db: DB = {
    ...wrap(pool as unknown as PgQueryable),
    kind: "postgres",
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const inner: DB = { ...wrap(client as unknown as PgQueryable), kind: "postgres", tx: (f) => f(inner), close: async () => {} };
        const out = await fn(inner);
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
  return db;
}

type PGliteLike = {
  query: (q: string, p?: unknown[]) => Promise<{ rows: unknown[] }>;
  exec: (q: string) => Promise<unknown>;
  transaction: <T>(fn: (tx: PGliteLike) => Promise<T>) => Promise<T>;
  close?: () => Promise<void>;
};

async function pgliteDriver(dir: string | null): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const pg = (dir ? new PGlite(dir) : new PGlite()) as unknown as PGliteLike;
  const wrap = (q: PGliteLike): Omit<DB, "tx" | "close" | "kind"> => ({
    all: async <T,>(s: string, p: unknown[] = []) => (await q.query(numbered(s), p)).rows as T[],
    one: async <T,>(s: string, p: unknown[] = []) => (await q.query(numbered(s), p)).rows[0] as T | undefined,
    run: async (s: string, p: unknown[] = []) => {
      await q.query(numbered(s), p);
    },
    exec: async (s: string) => {
      await q.exec(s);
    },
  });
  const db: DB = {
    ...wrap(pg),
    kind: "pglite",
    tx: (fn) =>
      pg.transaction((t) => {
        const inner: DB = { ...wrap(t), kind: "pglite", tx: (f) => f(inner), close: async () => {} };
        return fn(inner);
      }),
    close: async () => {
      await pg.close?.();
    },
  };
  return db;
}

// ---------------------------------------------------------------- lifecycle

export async function openDb(target: string = process.env.DATABASE_URL ?? localDbDir()): Promise<DB> {
  const isUrl = /^postgres(ql)?:\/\//.test(target);
  const db = isUrl ? await postgresDriver(target) : await pgliteDriver(target === ":memory:" ? null : target);
  if (!isUrl) await db.exec("CREATE SCHEMA IF NOT EXISTS turkce; SET search_path TO turkce;");
  await migrate(db);
  await seedIfEmpty(db);
  return db;
}

const g = globalThis as unknown as { __turkceDb?: Promise<DB> };

/** Shared, lazily-initialised connection (cached across hot reloads and warm serverless calls). */
export function getDb(): Promise<DB> {
  if (!g.__turkceDb) {
    g.__turkceDb = openDb().catch((e) => {
      g.__turkceDb = undefined;
      throw e;
    });
  }
  return g.__turkceDb;
}

/** For tests: install a specific database instance. */
export function setDbForTesting(db: DB) {
  g.__turkceDb = Promise.resolve(db);
}

export function dbLabel(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return `PGlite (local) · ${localDbDir()}`;
  try {
    const u = new URL(url);
    return `Postgres · ${u.hostname} · schema turkce`;
  } catch {
    return "Postgres";
  }
}

async function migrate(db: DB) {
  const done = await db.one<{ ok: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'job_runs') AS ok",
  );
  if (!done?.ok) {
    // Serverless cold starts can race: create the schema under a lock, inside one transaction.
    await db.tx(async (t) => {
      await t.run("SELECT pg_advisory_xact_lock(365364)");
      const again = await t.one<{ ok: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'job_runs') AS ok",
      );
      if (again?.ok) return;
      for (const stmt of SCHEMA_SQL.split(";").map((x) => x.trim()).filter(Boolean)) await t.run(stmt);
      await t.run("INSERT INTO settings (key, value) VALUES ('schema_version', ?) ON CONFLICT (key) DO NOTHING", [String(SCHEMA_VERSION)]);
    });
  }
}

/** SQL expression for "now" as an ISO-8601 UTC string (matches new Date().toISOString()). */
export const NOW_ISO = `to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
