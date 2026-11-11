/**
 * SQLite access (better-sqlite3). One local file: data/turkce.db (override with TURKCE_DB).
 * Server-only. The schema is created/migrated on first open and seeded from data/vocab.json.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { seedIfEmpty } from "./seed";

export type DB = Database.Database;

export function dbPath(): string {
  return process.env.TURKCE_DB ?? path.join(process.cwd(), "data", "turkce.db");
}

const globalForDb = globalThis as unknown as { __turkceDb?: DB; __turkceDbPath?: string };

export function openDb(file = dbPath()): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  seedIfEmpty(db);
  return db;
}

/** Shared connection (cached across Next.js hot reloads). */
export function getDb(): DB {
  const file = dbPath();
  if (!globalForDb.__turkceDb || globalForDb.__turkceDbPath !== file) {
    globalForDb.__turkceDb = openDb(file);
    globalForDb.__turkceDbPath = file;
  }
  return globalForDb.__turkceDb;
}

/** For tests: use a fresh in-memory database. */
export function setDbForTesting(db: DB) {
  globalForDb.__turkceDb = db;
  globalForDb.__turkceDbPath = dbPath();
}

function migrate(db: DB) {
  db.exec(SCHEMA_SQL);
  const row = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get() as { value: string } | undefined;
  if (!row) db.prepare("INSERT INTO settings (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
}
