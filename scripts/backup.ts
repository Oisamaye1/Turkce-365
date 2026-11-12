/** Writes a full JSON export of the database to data/backups/.   npm run backup */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";
import { exportAllJson } from "../src/lib/db/export";

process.chdir(path.resolve(__dirname, ".."));
loadEnv();

async function main() {
  const dir = path.resolve("data", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const file = path.join(dir, `turkce-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(await exportAllJson(), null, 1));
  console.log(`✓ Backup written: ${file}`);
  process.exit(0);
}
main();
