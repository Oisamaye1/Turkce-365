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
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

type Row = {
  id: number;
  date: string;
  prompt: string;
  my_text: string;
  corrected_json: string | null;
  score: number | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
};
const toRow = (r: Row): WritingRow => ({
  id: Number(r.id),
  date: r.date,
  prompt: r.prompt,
  myText: r.my_text,
  corrected: r.corrected_json ? JSON.parse(r.corrected_json) : null,
  score: r.score === null ? null : Number(r.score),
  attempts: Number(r.attempts ?? 0),
  lastError: r.last_error,
  createdAt: r.created_at,
});

export async function saveWriting(date: string, prompt: string, text: string): Promise<number> {
  const db = await getDb();
  const r = await db.one<{ id: number }>("INSERT INTO writings (date, prompt, my_text) VALUES (?, ?, ?) RETURNING id", [date, prompt, text]);
  return Number(r!.id);
}

export async function getWriting(id: number): Promise<WritingRow | null> {
  const db = await getDb();
  const r = await db.one<Row>("SELECT * FROM writings WHERE id = ?", [id]);
  return r ? toRow(r) : null;
}

export async function listWritings(limit = 20): Promise<WritingRow[]> {
  const db = await getDb();
  return (await db.all<Row>("SELECT * FROM writings ORDER BY id DESC LIMIT ?", [limit])).map(toRow);
}

/** Writings waiting for a correction (queued from the online app for the worker). */
export async function pendingWritings(maxAttempts = 3, limit = 10): Promise<WritingRow[]> {
  const db = await getDb();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  return (
    await db.all<Row>("SELECT * FROM writings WHERE corrected_json IS NULL AND attempts < ? AND created_at >= ? ORDER BY id LIMIT ?", [maxAttempts, since, limit])
  ).map(toRow);
}

export async function markWritingAttempt(id: number, error: string) {
  const db = await getDb();
  await db.run("UPDATE writings SET attempts = attempts + 1, last_error = ? WHERE id = ?", [error.slice(0, 500), id]);
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
export async function applyCorrection(writingId: number, date: string, correction: Correction): Promise<number[]> {
  const db = await getDb();
  await db.run("UPDATE writings SET corrected_json = ?, score = ?, last_error = NULL WHERE id = ?", [JSON.stringify(correction), correction.score, writingId]);
  const cardIds = await addCardsToDeck(
    correction.errors.map((e) => ({
      tr: e.correction,
      en: `Fix: ${e.original}`,
      pos: "correction",
      note: `${e.rule}: ${e.explanationEN}`,
    })),
    "correction",
  );
  for (const [i, e] of correction.errors.entries()) {
    await db.run("INSERT INTO mistakes (date, rule_tag, original, correction, explanation, source, card_id) VALUES (?, ?, ?, ?, ?, 'writing', ?)", [
      date,
      normalizeRuleTag(e.rule),
      e.original,
      e.correction,
      e.explanationEN,
      cardIds[i] ?? null,
    ]);
  }
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

export async function recentMistakes(sinceDate: string, limit = 30): Promise<MistakeRow[]> {
  const db = await getDb();
  const rows = await db.all<{ id: number; date: string; rule_tag: string; original: string; correction: string; explanation: string | null; source: string; resolved: number }>(
    "SELECT * FROM mistakes WHERE date >= ? ORDER BY id DESC LIMIT ?",
    [sinceDate, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    date: r.date,
    ruleTag: r.rule_tag,
    original: r.original,
    correction: r.correction,
    explanation: r.explanation,
    source: r.source,
    resolved: !!r.resolved,
  }));
}
