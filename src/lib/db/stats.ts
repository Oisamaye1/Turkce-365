import { getDb } from "./index";
import { getSettings, today } from "./settings";
import { addDays, sqliteTzModifier } from "@/lib/time";
import { getStep } from "@/lib/grammar/steps";

/** Local dates (YYYY-MM-DD) with any learning activity. */
export function activeDates(): Set<string> {
  const mod = sqliteTzModifier(getSettings().timezone);
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT date(timestamp, ?) AS d FROM review_log
       UNION SELECT DISTINCT date(timestamp, ?) FROM gym_log
       UNION SELECT DISTINCT date(completed_at, ?) FROM lessons WHERE completed_at IS NOT NULL`,
    )
    .all(mod, mod, mod) as { d: string }[];
  return new Set(rows.map((r) => r.d).filter(Boolean));
}

/** Consecutive active days ending today (or yesterday, if today isn't done yet). */
export function streak(): { current: number; best: number; activeToday: boolean } {
  const days = activeDates();
  const t = today();
  const activeToday = days.has(t);
  let cur = 0;
  let d = activeToday ? t : addDays(t, -1);
  while (days.has(d)) {
    cur++;
    d = addDays(d, -1);
  }
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const x of sorted) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    best = Math.max(best, run);
    prev = x;
  }
  return { current: cur, best: Math.max(best, cur), activeToday };
}

export function wordsLearned(sinceIso?: string, untilIso?: string): number {
  const r = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM reviews r JOIN cards c ON c.id = r.card_id
       WHERE r.direction = 'en-tr' AND c.source != 'correction' AND r.introduced_at >= ? AND r.introduced_at < ?`,
    )
    .get(sinceIso ?? "", untilIso ?? "9999") as { n: number };
  return r.n;
}

/** Recall rate on cards that were already known (excludes each card's first-ever answer). */
export function retention(sinceIso: string, untilIso = "9999"): { rate: number; reviews: number } {
  const r = getDb()
    .prepare(
      `SELECT COUNT(*) AS n, SUM(CASE l.result WHEN 'correct' THEN 1.0 WHEN 'almost' THEN 0.5 ELSE 0 END) AS score
       FROM review_log l
       WHERE l.context = 'review' AND l.timestamp >= ? AND l.timestamp < ?
         AND EXISTS (SELECT 1 FROM review_log p WHERE p.card_id = l.card_id AND p.direction = l.direction AND p.id < l.id)`,
    )
    .get(sinceIso, untilIso) as { n: number; score: number | null };
  return { rate: r.n ? (r.score ?? 0) / r.n : 0, reviews: r.n };
}

export interface DayActivity {
  date: string;
  reviews: number;
  correct: number;
  drills: number;
  drillsCorrect: number;
  newWords: number;
}

export function dailyActivity(days = 28): DayActivity[] {
  const mod = sqliteTzModifier(getSettings().timezone);
  const from = addDays(today(), -(days - 1));
  const db = getDb();
  const rev = db
    .prepare(
      `SELECT date(timestamp, ?) AS d, COUNT(*) AS n, SUM(result = 'correct') AS c FROM review_log
       WHERE date(timestamp, ?) >= ? GROUP BY d`,
    )
    .all(mod, mod, from) as { d: string; n: number; c: number }[];
  const gym = db
    .prepare(
      `SELECT date(timestamp, ?) AS d, COUNT(*) AS n, SUM(result = 'correct') AS c FROM gym_log
       WHERE date(timestamp, ?) >= ? GROUP BY d`,
    )
    .all(mod, mod, from) as { d: string; n: number; c: number }[];
  const fresh = db
    .prepare(
      `SELECT date(introduced_at, ?) AS d, COUNT(*) AS n FROM reviews WHERE direction = 'en-tr' AND date(introduced_at, ?) >= ? GROUP BY d`,
    )
    .all(mod, mod, from) as { d: string; n: number }[];
  const out: DayActivity[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const r = rev.find((x) => x.d === date);
    const g = gym.find((x) => x.d === date);
    const f = fresh.find((x) => x.d === date);
    out.push({ date, reviews: r?.n ?? 0, correct: r?.c ?? 0, drills: g?.n ?? 0, drillsCorrect: g?.c ?? 0, newWords: f?.n ?? 0 });
  }
  return out;
}

export interface RecurringMistake {
  label: string;
  count: number;
  kind: "rule" | "word";
}

/** Most frequent mistakes in a window: grammar rules (writing + drills) and vocabulary. */
export function topMistakes(sinceIso: string, sinceDate: string, limit = 3): RecurringMistake[] {
  const db = getDb();
  const writing = db.prepare("SELECT rule_tag AS tag, COUNT(*) AS n FROM mistakes WHERE date >= ? GROUP BY rule_tag").all(sinceDate) as {
    tag: string;
    n: number;
  }[];
  const drills = db
    .prepare("SELECT step_id, COUNT(*) AS n FROM gym_log WHERE result = 'wrong' AND timestamp >= ? GROUP BY step_id")
    .all(sinceIso) as { step_id: number; n: number }[];
  const words = db
    .prepare(
      `SELECT c.tr, c.en, COUNT(*) AS n FROM review_log l JOIN cards c ON c.id = l.card_id
       WHERE l.result = 'wrong' AND l.timestamp >= ? GROUP BY c.id HAVING n >= 2 ORDER BY n DESC LIMIT 5`,
    )
    .all(sinceIso) as { tr: string; en: string; n: number }[];
  const byRule = new Map<string, number>();
  for (const w of writing) byRule.set(w.tag, (byRule.get(w.tag) ?? 0) + w.n);
  for (const d of drills) {
    const tag = getStep(d.step_id).tag;
    byRule.set(tag, (byRule.get(tag) ?? 0) + d.n);
  }
  const items: RecurringMistake[] = [
    ...[...byRule].map(([label, count]) => ({ label, count, kind: "rule" as const })),
    ...words.map((w) => ({ label: `${w.tr} (${w.en})`, count: w.n, kind: "word" as const })),
  ];
  return items.sort((a, b) => b.count - a.count).slice(0, limit);
}

export function totals() {
  const db = getDb();
  const cards = (db.prepare("SELECT COUNT(*) AS n FROM cards WHERE source = 'seed'").get() as { n: number }).n;
  const introduced = wordsLearned();
  const mature = (
    db.prepare("SELECT COUNT(*) AS n FROM reviews WHERE direction = 'en-tr' AND interval >= 21").get() as { n: number }
  ).n;
  const reviewsTotal = (db.prepare("SELECT COUNT(*) AS n FROM review_log").get() as { n: number }).n;
  const lessonsDone = (db.prepare("SELECT COUNT(*) AS n FROM lessons WHERE completed_at IS NOT NULL").get() as { n: number }).n;
  return { seedCards: cards, introduced, mature, reviewsTotal, lessonsDone };
}
