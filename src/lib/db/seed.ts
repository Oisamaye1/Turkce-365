import type Database from "better-sqlite3";
import vocabJson from "../../../data/vocab.json";
import type { VocabEntry } from "@/lib/vocab/types";

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

/** Load data/vocab.json into `cards` (source = seed) the first time, and default settings. */
export function seedIfEmpty(db: Database.Database) {
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(k, v);

  const count = (db.prepare("SELECT COUNT(*) AS n FROM cards WHERE source = 'seed'").get() as { n: number }).n;
  if (count > 0) return;
  const vocab = vocabJson as VocabEntry[];
  const ins = db.prepare(`INSERT INTO cards (tr, en, pos, unit, exTr, exEn, note, softens, harmonyOverride, stem, aorist, flags, source, seq)
    VALUES (@tr, @en, @pos, @unit, @exTr, @exEn, @note, @softens, @harmonyOverride, @stem, @aorist, @flags, 'seed', @seq)`);
  const tx = db.transaction(() => {
    vocab.forEach((v, i) =>
      ins.run({
        tr: v.tr,
        en: v.en,
        pos: v.pos,
        unit: v.unit,
        exTr: v.exTr ?? null,
        exEn: v.exEn ?? null,
        note: v.note ?? null,
        softens: v.softens === undefined ? null : v.softens ? 1 : 0,
        harmonyOverride: v.harmonyOverride ?? null,
        stem: v.stem ?? null,
        aorist: v.aorist ?? null,
        flags: flagsJson(v),
        seq: i + 1,
      }),
    );
  });
  tx();
}

/** Upsert data/vocab.json into the seed deck, matching on (tr, pos). Keeps all review history. */
export function syncSeedVocab(db: Database.Database): { updated: number; inserted: number; total: number } {
  const vocab = vocabJson as VocabEntry[];
  const find = db.prepare("SELECT id FROM cards WHERE source = 'seed' AND tr = ? AND pos = ?");
  const upd = db.prepare(`UPDATE cards SET en=@en, unit=@unit, exTr=@exTr, exEn=@exEn, note=@note, softens=@softens,
    harmonyOverride=@harmonyOverride, stem=@stem, aorist=@aorist, flags=@flags, seq=@seq WHERE id=@id`);
  const ins = db.prepare(`INSERT INTO cards (tr, en, pos, unit, exTr, exEn, note, softens, harmonyOverride, stem, aorist, flags, source, seq)
    VALUES (@tr, @en, @pos, @unit, @exTr, @exEn, @note, @softens, @harmonyOverride, @stem, @aorist, @flags, 'seed', @seq)`);
  let updated = 0;
  let inserted = 0;
  db.transaction(() => {
    vocab.forEach((v, i) => {
      const row = {
        tr: v.tr,
        en: v.en,
        pos: v.pos,
        unit: v.unit,
        exTr: v.exTr ?? null,
        exEn: v.exEn ?? null,
        note: v.note ?? null,
        softens: v.softens === undefined ? null : v.softens ? 1 : 0,
        harmonyOverride: v.harmonyOverride ?? null,
        stem: v.stem ?? null,
        aorist: v.aorist ?? null,
        flags: flagsJson(v),
        seq: i + 1,
      };
      const hit = find.get(v.tr, v.pos) as { id: number } | undefined;
      if (hit) {
        upd.run({ ...row, id: hit.id });
        updated++;
      } else {
        ins.run(row);
        inserted++;
      }
    });
  })();
  return { updated, inserted, total: vocab.length };
}
