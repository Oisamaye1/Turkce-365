/**
 * Backs up the SQLite database to data/backups/ (a consistent online backup) and
 * writes a JSON export next to it.   npm run backup
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db";
import { exportAllJson } from "../src/lib/db/export";

process.chdir(path.resolve(__dirname, ".."));

async function main() {
  const dir = path.resolve("data", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const dbFile = path.join(dir, `turkce-${stamp}.db`);
  await getDb().backup(dbFile);
  const jsonFile = path.join(dir, `turkce-${stamp}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(exportAllJson(), null, 1));
  console.log(`✓ Backup written:\n  ${dbFile}\n  ${jsonFile}`);
}
main();
