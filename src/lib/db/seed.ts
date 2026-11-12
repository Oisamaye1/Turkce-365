import vocabJson from "../../../data/vocab.json";
import type { VocabEntry } from "@/lib/vocab/types";
import type { DB } from "./index";

const DEFAULT_SETTINGS: Record<string, string> = {
  new_cards_per_day: "15",
  lesson_time: "05:30",
  timezone: "Europe/Istanbul",
};

export function flagsJson(v: Partial<VocabEntry>): string | null {
  const f: Record<string, unknown> = {};
  for (const k of ["dropsVowel", "doubles", "yBuffer", "compound", "noDrill", "irregular"] as const) {
    if (v[k]) f[k] = v[k];
  }
  return Object.keys(f).length ? JSON.stringify(f) : null;
}

function rowValues(v: VocabEntry, seq: number): unknown[] {
  return [
    v.tr,
    v.en,
    v.pos,
    v.unit,
    v.exTr ?? null,
    v.exEn ?? null,
    v.note ?? null,
    v.softens === undefined ? null : v.softens ? 1 : 0,
    v.harmonyOverride ?? null,
    v.stem ?? null,
    v.aorist ?? null,
    flagsJson(v),
    seq,
  ];
}

const INSERT_COLS = `(tr, en, pos, unit, "exTr", "exEn", note, softens, "harmonyOverride", stem, aorist, flags, seq, source)`;

async function insertBatch(db: DB, rows: unknown[][]) {
  const placeholders = rows.map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed')`).join(", ");
  await db.run(`INSERT INTO cards ${INSERT_COLS} VALUES ${placeholders}`, rows.flat());
}

/** Load data/vocab.json into `cards` (source = seed) the first time, plus default settings. */
export async function seedIfEmpty(db: DB) {
  const n = await db.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM cards WHERE source = 'seed'");
  if (Number(n?.n) > 0) return;
  await db.tx(async (t) => {
    // Serialise concurrent cold starts (two serverless instances seeding at once).
    await t.run("SELECT pg_advisory_xact_lock(365365)");
    const again = await t.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM cards WHERE source = 'seed'");
    if (Number(again?.n) > 0) return;
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      await t.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING", [k, v]);
    }
    const vocab = vocabJson as VocabEntry[];
    for (let i = 0; i < vocab.length; i += 250) {
      await insertBatch(
        t,
        vocab.slice(i, i + 250).map((v, j) => rowValues(v, i + j + 1)),
      );
    }
  });
}

/** Upsert data/vocab.json into the seed deck, matching on (tr, pos). Keeps all review history. */
export async function syncSeedVocab(db: DB): Promise<{ updated: number; inserted: number; total: number }> {
  const vocab = vocabJson as VocabEntry[];
  let updated = 0;
  let inserted = 0;
  await db.tx(async (t) => {
    const existing = await t.all<{ id: number; tr: string; pos: string }>("SELECT id, tr, pos FROM cards WHERE source = 'seed'");
    const byKey = new Map(existing.map((r) => [`${r.tr}|${r.pos}`, r.id]));
    const fresh: unknown[][] = [];
    for (const [i, v] of vocab.entries()) {
      const id = byKey.get(`${v.tr}|${v.pos}`);
      const vals = rowValues(v, i + 1);
      if (id !== undefined) {
        await t.run(
          `UPDATE cards SET en = ?, unit = ?, "exTr" = ?, "exEn" = ?, note = ?, softens = ?, "harmonyOverride" = ?, stem = ?, aorist = ?, flags = ?, seq = ? WHERE id = ?`,
          [...vals.slice(1, 2), ...vals.slice(3), id],
        );
        updated++;
      } else {
        fresh.push(vals);
        inserted++;
      }
    }
    for (let i = 0; i < fresh.length; i += 250) await insertBatch(t, fresh.slice(i, i + 250));
  });
  return { updated, inserted, total: vocab.length };
}
