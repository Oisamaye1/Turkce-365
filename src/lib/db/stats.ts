import { getDb } from "./index";
import { getSettings, today } from "./settings";
import { addDays } from "@/lib/time";
import { getStep } from "@/lib/grammar/steps";

/** SQL: local date (YYYY-MM-DD) of an ISO-UTC text column in the learner's timezone ($tz param). */
const LOCAL_DATE = (col: string) => `to_char((${col})::timestamptz AT TIME ZONE ?, 'YYYY-MM-DD')`;

/** Local dates (YYYY-MM-DD) with any learning activity. */
export async function activeDates(): Promise<Set<string>> {
  const { timezone: tz } = await getSettings();
  const db = await getDb();
  const rows = await db.all<{ d: string }>(
    `SELECT DISTINCT ${LOCAL_DATE("timestamp")} AS d FROM review_log
     UNION SELECT DISTINCT ${LOCAL_DATE("timestamp")} FROM gym_log
     UNION SELECT DISTINCT ${LOCAL_DATE("completed_at")} FROM lessons WHERE completed_at IS NOT NULL`,
    [tz, tz, tz],
  );
  return new Set(rows.map((r) => r.d).filter(Boolean));
}

/** Consecutive active days ending today (or yesterday, if today isn't done yet). */
export async function streak(): Promise<{ current: number; best: number; activeToday: boolean }> {
  const days = await activeDates();
  const t = await today();
  const activeToday = days.has(t);
  let cur = 0;
  let d = activeToday ? t : addDays(t, -1);
  while (days.has(d)) {
    cur++;
    d = addDays(d, -1);
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const x of [...days].sort()) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    best = Math.max(best, run);
    prev = x;
  }
  return { current: cur, best: Math.max(best, cur), activeToday };
}

export async function wordsLearned(sinceIso = "", untilIso = "9999"): Promise<number> {
  const db = await getDb();
  const r = await db.one<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM reviews r JOIN cards c ON c.id = r.card_id
     WHERE r.direction = 'en-tr' AND c.source <> 'correction' AND r.introduced_at >= ? AND r.introduced_at < ?`,
    [sinceIso, untilIso],
  );
  return Number(r?.n ?? 0);
}

/** Recall rate on cards that were already known (excludes each card's first-ever answer). */
export async function retention(sinceIso: string, untilIso = "9999"): Promise<{ rate: number; reviews: number }> {
  const db = await getDb();
  const r = await db.one<{ n: number; score: number | null }>(
    `SELECT COUNT(*)::int AS n, SUM(CASE l.result WHEN 'correct' THEN 1.0 WHEN 'almost' THEN 0.5 ELSE 0 END)::float8 AS score
     FROM review_log l
     WHERE l.context = 'review' AND l.timestamp >= ? AND l.timestamp < ?
       AND EXISTS (SELECT 1 FROM review_log p WHERE p.card_id = l.card_id AND p.direction = l.direction AND p.id < l.id)`,
    [sinceIso, untilIso],
  );
  const n = Number(r?.n ?? 0);
  return { rate: n ? Number(r?.score ?? 0) / n : 0, reviews: n };
}

export interface DayActivity {
  date: string;
  reviews: number;
  correct: number;
  drills: number;
  drillsCorrect: number;
  newWords: number;
}

export async function dailyActivity(days = 28): Promise<DayActivity[]> {
  const { timezone: tz } = await getSettings();
  const from = addDays(await today(), -(days - 1));
  // Only scan rows from (roughly) the window, then bucket by local date.
  const sinceIso = new Date(Date.parse(`${from}T00:00:00Z`) - 86_400_000).toISOString();
  const db = await getDb();
  const rev = await db.all<{ d: string; n: number; c: number }>(
    `SELECT ${LOCAL_DATE("timestamp")} AS d, COUNT(*)::int AS n, COUNT(*) FILTER (WHERE result = 'correct')::int AS c
     FROM review_log WHERE timestamp >= ? GROUP BY 1`,
    [tz, sinceIso],
  );
  const gym = await db.all<{ d: string; n: number; c: number }>(
    `SELECT ${LOCAL_DATE("timestamp")} AS d, COUNT(*)::int AS n, COUNT(*) FILTER (WHERE result = 'correct')::int AS c
     FROM gym_log WHERE timestamp >= ? GROUP BY 1`,
    [tz, sinceIso],
  );
  const fresh = await db.all<{ d: string; n: number }>(
    `SELECT ${LOCAL_DATE("introduced_at")} AS d, COUNT(*)::int AS n FROM reviews
     WHERE direction = 'en-tr' AND introduced_at >= ? GROUP BY 1`,
    [tz, sinceIso],
  );
  const out: DayActivity[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const r = rev.find((x) => x.d === date);
    const g = gym.find((x) => x.d === date);
    const f = fresh.find((x) => x.d === date);
    out.push({
      date,
      reviews: Number(r?.n ?? 0),
      correct: Number(r?.c ?? 0),
      drills: Number(g?.n ?? 0),
      drillsCorrect: Number(g?.c ?? 0),
      newWords: Number(f?.n ?? 0),
    });
  }
  return out;
}

export interface RecurringMistake {
  label: string;
  count: number;
  kind: "rule" | "word";
}

/** Most frequent mistakes in a window: grammar rules (writing + drills) and vocabulary. */
export async function topMistakes(sinceIso: string, sinceDate: string, limit = 3): Promise<RecurringMistake[]> {
  const db = await getDb();
  const writing = await db.all<{ tag: string; n: number }>("SELECT rule_tag AS tag, COUNT(*)::int AS n FROM mistakes WHERE date >= ? GROUP BY rule_tag", [sinceDate]);
  const drills = await db.all<{ step_id: number; n: number }>(
    "SELECT step_id, COUNT(*)::int AS n FROM gym_log WHERE result = 'wrong' AND timestamp >= ? GROUP BY step_id",
    [sinceIso],
  );
  const words = await db.all<{ tr: string; en: string; n: number }>(
    `SELECT c.tr, c.en, x.n FROM cards c JOIN (
       SELECT card_id, COUNT(*)::int AS n FROM review_log WHERE result = 'wrong' AND timestamp >= ? GROUP BY card_id HAVING COUNT(*) >= 2
     ) x ON x.card_id = c.id ORDER BY x.n DESC LIMIT 5`,
    [sinceIso],
  );
  const byRule = new Map<string, number>();
  for (const w of writing) byRule.set(w.tag, (byRule.get(w.tag) ?? 0) + Number(w.n));
  for (const d of drills) {
    const tag = getStep(Number(d.step_id)).tag;
    byRule.set(tag, (byRule.get(tag) ?? 0) + Number(d.n));
  }
  const items: RecurringMistake[] = [
    ...[...byRule].map(([label, count]) => ({ label, count, kind: "rule" as const })),
    ...words.map((w) => ({ label: `${w.tr} (${w.en})`, count: Number(w.n), kind: "word" as const })),
  ];
  return items.sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function totals() {
  const db = await getDb();
  const r = await db.one<{ cards: number; mature: number; reviews: number; lessons: number }>(
    `SELECT
       (SELECT COUNT(*) FROM cards WHERE source = 'seed')::int AS cards,
       (SELECT COUNT(*) FROM reviews WHERE direction = 'en-tr' AND interval_days >= 21)::int AS mature,
       (SELECT COUNT(*) FROM review_log)::int AS reviews,
       (SELECT COUNT(*) FROM lessons WHERE completed_at IS NOT NULL)::int AS lessons`,
  );
  return {
    seedCards: Number(r?.cards ?? 0),
    introduced: await wordsLearned(),
    mature: Number(r?.mature ?? 0),
    reviewsTotal: Number(r?.reviews ?? 0),
    lessonsDone: Number(r?.lessons ?? 0),
  };
}
