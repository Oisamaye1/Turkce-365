/**
 * Builds data/vocab.json + data/units.json from the compact, human-reviewable
 * source files in data/vocab-src/*.txt, and validates every entry.
 *
 * Source line format (fields separated by " | "):
 *   tr | en | pos [flags] | example TR | example EN | note
 * Unit headers:
 *   @ 12 | Adjectives 1 | Sıfatlar 1
 *
 * POS codes: n proper v adj adv pron phrase num postp conj q part interj
 * Noun / adjective flags:
 *   s    softens (kitap → kitabı)        ns   does not soften (top → topu)
 *   f    front-harmony override (saat → saate)
 *   dv   drops vowel (şehir → şehri)      dbl  doubles consonant (hak → hakkı)
 *   y    y-buffer (su → suyu, suyun)      cmp  compound noun (Türk kahvesi)
 *   x    exclude from auto-generated drills
 * Verb flags:
 *   first flag is the 3sg aorist of the last word (gelir); compound verbs get the prefix added
 *   s    stem softens t → d (git → gidiyor)
 *   irr  aorist intentionally differs from the regular rule
 *
 * Run: npm run vocab:build
 */
import fs from "node:fs";
import path from "node:path";
import { regularAorist } from "../src/lib/turkish/verbs";
import type { PartOfSpeech, UnitInfo, VocabEntry } from "../src/lib/vocab/types";

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "data", "vocab-src");

const POS: Record<string, PartOfSpeech> = {
  n: "noun",
  proper: "proper",
  v: "verb",
  adj: "adj",
  adv: "adv",
  pron: "pron",
  phrase: "phrase",
  num: "num",
  postp: "postp",
  conj: "conj",
  q: "question",
  part: "particle",
  interj: "interj",
};

const TURKISH_WORD = /^[a-zçğıöşüâîûA-ZÇĞİÖŞÜ' .,?!…/\-]+$/;

export interface BuildResult {
  entries: VocabEntry[];
  units: UnitInfo[];
  errors: string[];
  warnings: string[];
}

export function parseVocabSources(dir = SRC_DIR): BuildResult {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).sort();
  const entries: VocabEntry[] = [];
  const units: UnitInfo[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  let unit = 0;

  for (const file of files) {
    const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
    lines.forEach((raw, idx) => {
      const where = `${file}:${idx + 1}`;
      const line = raw.trim();
      if (!line || line.startsWith("#")) return;
      if (line.startsWith("@")) {
        const [num, title, titleTr] = line.slice(1).split("|").map((s) => s.trim());
        unit = Number(num);
        if (!unit || !title) errors.push(`${where}: bad unit header`);
        units.push({ unit, title, titleTr: titleTr ?? title });
        return;
      }
      const f = line.split(" | ").map((s) => s.trim());
      const [tr, en, posField, exTr, exEn, note] = f;
      if (!tr || !en || !posField) {
        errors.push(`${where}: needs at least "tr | en | pos" — got "${line}"`);
        return;
      }
      if (!unit) errors.push(`${where}: entry before any unit header`);
      const [posCode, ...flags] = posField.split(/\s+/);
      const pos = POS[posCode];
      if (!pos) {
        errors.push(`${where}: unknown pos "${posCode}"`);
        return;
      }
      if (!TURKISH_WORD.test(tr)) errors.push(`${where}: unexpected characters in "${tr}"`);
      if (tr !== tr.trim() || /\s{2,}/.test(tr)) errors.push(`${where}: whitespace in "${tr}"`);
      if (exTr && !exEn) errors.push(`${where}: example without translation`);

      const e: VocabEntry = { tr, en, pos, unit };
      if (exTr && exTr !== "-") e.exTr = exTr;
      if (exEn && exEn !== "-") e.exEn = exEn;
      if (note) e.note = note;

      if (pos === "verb") {
        if (!/m[ae]k$/.test(tr)) errors.push(`${where}: verb "${tr}" must be an infinitive in -mak/-mek`);
        const stem = tr.replace(/m[ae]k$/, "");
        const lastSpace = stem.lastIndexOf(" ");
        const prefix = lastSpace === -1 ? "" : stem.slice(0, lastSpace + 1);
        const aor = flags.find((x) => !["s", "irr"].includes(x));
        const softens = flags.includes("s");
        if (!aor) errors.push(`${where}: verb "${tr}" needs its aorist (e.g. "v gelir")`);
        else {
          e.stem = stem;
          e.aorist = prefix + aor;
          if (softens) {
            e.irregular = `${stem} → ${stem.slice(0, -1)}d- before vowels`;
          }
          const expected = regularAorist(stem, softens);
          if (expected !== e.aorist && !flags.includes("irr")) {
            errors.push(`${where}: aorist "${e.aorist}" ≠ regular "${expected}" — fix or mark "irr"`);
          }
        }
      } else {
        for (const fl of flags) {
          if (fl === "s") e.softens = true;
          else if (fl === "ns") e.softens = false;
          else if (fl === "f") e.harmonyOverride = "front";
          else if (fl === "dv") e.dropsVowel = true;
          else if (fl === "dbl") e.doubles = true;
          else if (fl === "y") e.yBuffer = true;
          else if (fl === "cmp") e.compound = true;
          else if (fl === "x") e.noDrill = true;
          else errors.push(`${where}: unknown flag "${fl}"`);
        }
        const single = !tr.includes(" ") && !e.compound;
        if ((pos === "noun" || pos === "adj") && single && !e.doubles && /[pçtk]$/.test(tr) && e.softens === undefined) {
          errors.push(`${where}: "${tr}" ends in p/ç/t/k — mark "s" (softens) or "ns" (doesn't)`);
        }
        if (e.softens && !/[pçtkg]$/.test(tr)) errors.push(`${where}: "${tr}" flagged softens but can't soften`);
      }

      const key = `${tr}|${pos}`;
      if (seen.has(key)) errors.push(`${where}: duplicate "${tr}" (${pos}), first at ${seen.get(key)}`);
      seen.set(key, where);
      entries.push(e);
    });
  }

  const counts = new Map<number, number>();
  for (const e of entries) counts.set(e.unit, (counts.get(e.unit) ?? 0) + 1);
  for (const u of units) {
    const c = counts.get(u.unit) ?? 0;
    if (c < 20 || c > 30) warnings.push(`unit ${u.unit} (${u.title}) has ${c} entries`);
  }
  return { entries, units, errors, warnings };
}

function main() {
  const { entries, units, errors, warnings } = parseVocabSources();
  for (const w of warnings) console.warn("warn:", w);
  if (errors.length) {
    for (const e of errors) console.error("error:", e);
    console.error(`\n${errors.length} error(s) — vocab.json NOT written.`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(ROOT, "data", "vocab.json"), JSON.stringify(entries, null, 1) + "\n");
  fs.writeFileSync(path.join(ROOT, "data", "units.json"), JSON.stringify(units, null, 1) + "\n");
  const byPos = entries.reduce<Record<string, number>>((acc, e) => ((acc[e.pos] = (acc[e.pos] ?? 0) + 1), acc), {});
  console.log(`✓ ${entries.length} entries in ${units.length} units →  data/vocab.json`);
  console.log("  by part of speech:", byPos);
  console.log(`  with examples: ${entries.filter((e) => e.exTr).length}`);
}

if (process.argv[1] && process.argv[1].endsWith("build-vocab.ts")) main();
