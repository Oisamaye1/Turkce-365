/**
 * Database access — Postgres everywhere, two drivers:
 *   - DATABASE_URL set  → hosted Postgres (Supabase) via node-postgres (used on Vercel and by the
 *                          worker on your computer).
 *   - otherwise         → embedded PGlite stored in data/pglite (local-first, no server needed).
 * Same SQL in both. Server-only.
 */
import fs from "node:fs";
import path from "node:path";
import { APP_SCHEMA_SQL, SCHEMA_MARKER, SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { addMissingSeedWords, seedIfEmpty } from "./seed";

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

// ---------------------------------------------------------------- multi-user scoping
/*
 * Every learner has their own Postgres schema with the same tables (the first account, the
 * admin, keeps the original "turkce" schema). Accounts and signup codes live in "turkce_app".
 * Code calls getDb() exactly as before; it returns a view of the signed-in learner's schema in
 * which every table name is qualified with that schema. No query needs a user_id.
 */

/** Tables that exist once per learner. */
export const USER_TABLES = [
  "settings",
  "cards",
  "reviews",
  "review_log",
  "grammar_progress",
  "gym_log",
  "lessons",
  "writings",
  "mistakes",
  "missions",
  "weekly_reports",
  "job_runs",
  "plan_days",
] as const;

export const APP_SCHEMA = "turkce_app";
export const LEGACY_SCHEMA = "turkce";
const SCHEMA_NAME = /^turkce(_u_[0-9a-f]{8,16})?$/;

export function isValidSchemaName(s: string): boolean {
  return SCHEMA_NAME.test(s);
}

const TABLE_REF = new RegExp(`\\b(FROM|JOIN|INTO|UPDATE)(\\s+)(${USER_TABLES.join("|")})\\b(?!\\s*\\.)`, "gi");
const qualified = new Map<string, string>();

/** Prefix every learner table after FROM / JOIN / INTO / UPDATE with the learner's schema. */
export function qualify(sql: string, schema: string): string {
  const key = `${schema}\u0000${sql}`;
  let out = qualified.get(key);
  if (out === undefined) {
    out = sql.replace(TABLE_REF, (_m, kw: string, ws: string, t: string) => `${kw}${ws}"${schema}".${t.toLowerCase()}`);
    if (qualified.size > 5000) qualified.clear();
    qualified.set(key, out);
  }
  return out;
}

function scoped(base: DB, schema: string): DB {
  const db: DB = {
    kind: base.kind,
    all: (s, p) => base.all(qualify(s, schema), p),
    one: (s, p) => base.one(qualify(s, schema), p),
    run: (s, p) => base.run(qualify(s, schema), p),
    exec: (s) => base.exec(qualify(s, schema)),
    tx: (fn) => base.tx((t) => fn(scoped(t, schema))),
    close: async () => {},
  };
  return db;
}

async function tableExists(db: DB, schema: string, table: string): Promise<boolean> {
  const r = await db.one<{ ok: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?) AS ok",
    [schema, table],
  );
  return !!r?.ok;
}

/** Shared tables: accounts, signup codes, audit log. */
async function ensureAppSchema(db: DB) {
  if (await tableExists(db, APP_SCHEMA, "audit_log")) return;
  await db.tx(async (t) => {
    await t.run("SELECT pg_advisory_xact_lock(365360)");
    if (await tableExists(t, APP_SCHEMA, "audit_log")) return;
    for (const stmt of APP_SCHEMA_SQL.split(";").map((x) => x.trim()).filter(Boolean)) await t.run(stmt);
  });
}

/** Create (or bring up to date) one learner's schema, then load the word deck. */
async function migrateUserSchema(base: DB, schema: string) {
  if (!isValidSchemaName(schema)) throw new Error(`Invalid schema name: ${schema}`);
  if (!(await tableExists(base, schema, SCHEMA_MARKER))) {
    // Serverless cold starts can race: create under a lock, inside one transaction.
    await base.tx(async (t) => {
      await t.run("SELECT pg_advisory_xact_lock(365364)");
      if (await tableExists(t, schema, SCHEMA_MARKER)) return;
      await t.run(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      await t.run(`SET LOCAL search_path TO "${schema}"`);
      for (const stmt of SCHEMA_SQL.split(";").map((x) => x.trim()).filter(Boolean)) await t.run(stmt);
      await t.run(
        `INSERT INTO "${schema}".settings (key, value) VALUES ('schema_version', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
        [String(SCHEMA_VERSION)],
      );
    });
  }
  const db = scoped(base, schema);
  await seedIfEmpty(db);
  await addMissingSeedWords(db);
}

// ---------------------------------------------------------------- lifecycle

const g = globalThis as unknown as {
  __turkceDb?: Promise<DB>;
  __turkceSchemas?: Map<string, Promise<DB>>;
  __turkceTestSchema?: string;
};

export async function openDb(target: string = process.env.DATABASE_URL ?? localDbDir()): Promise<DB> {
  const isUrl = /^postgres(ql)?:\/\//.test(target);
  const db = isUrl ? await postgresDriver(target) : await pgliteDriver(target === ":memory:" ? null : target);
  if (!isUrl) await db.exec(`CREATE SCHEMA IF NOT EXISTS ${LEGACY_SCHEMA}; SET search_path TO ${LEGACY_SCHEMA};`);
  await ensureAppSchema(db);
  await migrateUserSchema(db, LEGACY_SCHEMA);
  return db;
}

/** The raw connection (no learner scope): for accounts, codes and admin work. */
export function getBaseDb(): Promise<DB> {
  if (!g.__turkceDb) {
    g.__turkceDb = openDb().catch((e) => {
      g.__turkceDb = undefined;
      throw e;
    });
  }
  return g.__turkceDb;
}

/** A learner's database view; creates and seeds the schema the first time it's used. */
export async function getUserDb(schema: string): Promise<DB> {
  if (!isValidSchemaName(schema)) throw new Error(`Invalid schema name: ${schema}`);
  g.__turkceSchemas ??= new Map();
  let p = g.__turkceSchemas.get(schema);
  if (!p) {
    p = (async () => {
      const base = await getBaseDb();
      await migrateUserSchema(base, schema);
      return scoped(base, schema);
    })().catch((e) => {
      g.__turkceSchemas?.delete(schema);
      throw e;
    });
    g.__turkceSchemas.set(schema, p);
  }
  return p;
}

export class NotSignedInError extends Error {
  constructor() {
    super("Not signed in.");
  }
}

/** The signed-in learner's database (or the learner a worker/admin task runs as). */
export async function getDb(): Promise<DB> {
  const { currentUser, inRequest } = await import("@/lib/users/session");
  const user = await currentUser();
  if (user) return getUserDb(user.schemaName);
  if (g.__turkceTestSchema) return getUserDb(g.__turkceTestSchema);
  // A web request without a valid session never falls back to anyone's data.
  if (await inRequest()) throw new NotSignedInError();
  // Command-line scripts on your computer (backup, generate-lesson…): the original account.
  return getUserDb(LEGACY_SCHEMA);
}

/** Drop a learner's schema and everything in it. Never the original schema. */
export async function dropUserSchema(schema: string) {
  if (!isValidSchemaName(schema) || schema === LEGACY_SCHEMA) throw new Error("Refusing to drop this schema.");
  const base = await getBaseDb();
  await base.run(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  g.__turkceSchemas?.delete(schema);
}

/** For tests: install a database and act as the original learner when nobody is signed in. */
export function setDbForTesting(db: DB, schema: string = LEGACY_SCHEMA) {
  g.__turkceDb = Promise.resolve(db);
  g.__turkceSchemas = new Map([[LEGACY_SCHEMA, Promise.resolve(scoped(db, LEGACY_SCHEMA))]]);
  g.__turkceTestSchema = schema;
}

export function dbLabel(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return `PGlite (local) · ${localDbDir()} · one schema per learner`;
  try {
    const u = new URL(url);
    return `Postgres · ${u.hostname} · one schema per learner`;
  } catch {
    return "Postgres";
  }
}

/** SQL expression for "now" as an ISO-8601 UTC string (matches new Date().toISOString()). */
export const NOW_ISO = `to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
