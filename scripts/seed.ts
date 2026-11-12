/**
 * Creates the database if needed and syncs data/vocab.json into the seed deck
 * (updates changed entries, inserts new ones — your progress is kept).   npm run seed
 */
import path from "node:path";
import { loadEnv } from "./env";
import { getDb } from "../src/lib/db";
import { syncSeedVocab } from "../src/lib/db/seed";

process.chdir(path.resolve(__dirname, ".."));
loadEnv();

async function main() {
  const res = await syncSeedVocab(await getDb());
  console.log(`✓ Seed deck synced: ${res.updated} updated, ${res.inserted} inserted, ${res.total} total.`);
  process.exit(0);
}
main();
