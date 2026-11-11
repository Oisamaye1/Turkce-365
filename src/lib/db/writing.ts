import { getDb } from "./index";
import { addCardsToDeck } from "./cards";
import type { Correction } from "@/lib/lesson/schema";

export interface WritingRow {
  id: number;
  date: string;
  prompt: string;
  myText: string;
  corrected: Correction | null;
  score: number | null;
  createdAt: string;
}

type Row = { id: number; date: string; prompt: string; my_text: string; corrected_json: string | null; score: number | null; created_at: string };
const toRow = (r: Row): WritingRow => ({
  id: r.id,
  date: r.date,
  prompt: r.prompt,
  myText: r.my_text,
  corrected: r.corrected_json ? JSON.parse(r.corrected_json) : null,
  score: r.score,
  createdAt: r.created_at,
});

export function saveWriting(date: string, prompt: string, text: string): number {
  return Number(getDb().prepare("INSERT INTO writings (date, prompt, my_text) VALUES (?, ?, ?)").run(date, prompt, text).lastInsertRowid);
}

export function getWriting(id: number): WritingRow | null {
  const r = getDb().prepare("SELECT * FROM writings WHERE id = ?").get(id) as Row | undefined;
  return r ? toRow(r) : null;
}

export function listWritings(limit = 20): WritingRow[] {
  return (getDb().prepare("SELECT * FROM writings ORDER BY id DESC LIMIT ?").all(limit) as Row[]).map(toRow);
}

/** Normalise free-form rule names from the model into stable tags ("Past tense" → "past-tense"). */
export function normalizeRuleTag(rule: string): string {
  const r = rule.toLowerCase();
  const map: [RegExp, string][] = [
    [/vowel harmony|ünlü uyumu|harmony/, "vowel-harmony"],
    [/past/, "past-tense"],
    [/future/, "future-tense"],
    [/aorist|habitual|geniş/, "aorist"],
    [/present|continuous|-iyor|yor\b/, "present-continuous"],
    [/accusative|definite object|belirtme/, "accusative"],
    [/dative|yönelme/, "dative"],
    [/locative|bulunma/, "locative"],
    [/ablative|ayrılma/, "ablative"],
    [/genitive|ilgi/, "genitive"],
    [/possess/, "possessive"],
    [/plural|çoğul/, "plural"],
    [/copula|to be|personal ending|ek-fiil/, "copula"],
    [/question|soru/, "question-particle"],
    [/negat/, "negative"],
    [/abilit|can\b|yeterlilik/, "abilitative"],
    [/soften|consonant/, "consonant-change"],
    [/word order|order/, "word-order"],
    [/spell|typo|diacritic|letter/, "spelling"],
    [/vocab|word choice|lexical/, "word-choice"],
    [/article|agreement/, "agreement"],
  ];
  for (const [re, tag] of map) if (re.test(r)) return tag;
  return r.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "other";
}

/**
 * Store a correction: every error becomes a mistake row AND a review card due today
 * ("Fix: Ben okula gidiyorum dün" → "Dün okula gittim").
 */
export function applyCorrection(writingId: number, date: string, correction: Correction): number[] {
  const db = getDb();
  db.prepare("UPDATE writings SET corrected_json = ?, score = ? WHERE id = ?").run(JSON.stringify(correction), correction.score, writingId);
  const cardIds = addCardsToDeck(
    correction.errors.map((e) => ({
      tr: e.correction,
      en: `Fix: ${e.original}`,
      pos: "correction",
      note: `${e.rule}: ${e.explanationEN}`,
    })),
    "correction",
  );
  const ins = db.prepare(
    "INSERT INTO mistakes (date, rule_tag, original, correction, explanation, source, card_id) VALUES (?, ?, ?, ?, ?, 'writing', ?)",
  );
  correction.errors.forEach((e, i) => ins.run(date, normalizeRuleTag(e.rule), e.original, e.correction, e.explanationEN, cardIds[i] ?? null));
  return cardIds;
}

export interface MistakeRow {
  id: number;
  date: string;
  ruleTag: string;
  original: string;
  correction: string;
  explanation: string | null;
  source: string;
  resolved: boolean;
}

export function recentMistakes(sinceDate: string, limit = 30): MistakeRow[] {
  const rows = getDb()
    .prepare("SELECT * FROM mistakes WHERE date >= ? ORDER BY id DESC LIMIT ?")
    .all(sinceDate, limit) as { id: number; date: string; rule_tag: string; original: string; correction: string; explanation: string | null; source: string; resolved: number }[];
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    ruleTag: r.rule_tag,
    original: r.original,
    correction: r.correction,
    explanation: r.explanation,
    source: r.source,
    resolved: !!r.resolved,
  }));
}
