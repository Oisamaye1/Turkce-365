import { getDb, type DB } from "./index";
import { getSettings, today } from "./settings";
import { LEARNED_REPETITIONS, NEW_CARD_STATE, dueAt, schedule, type Grade, type SrsState } from "@/lib/srs/sm2";
import type { CheckResult } from "@/lib/turkish/answer";
import { startOfLocalDayIso } from "@/lib/time";

export type Direction = "en-tr" | "tr-en";
export type CardSource = "seed" | "lesson" | "correction";

export interface Card {
  id: number;
  tr: string;
  en: string;
  pos: string;
  unit: number;
  exTr: string | null;
  exEn: string | null;
  note: string | null;
  softens: boolean | null;
  harmonyOverride: string | null;
  stem: string | null;
  aorist: string | null;
  flags: Record<string, unknown>;
  source: CardSource;
  seq: number;
  leech: boolean;
}

export interface ReviewItem {
  card: Card;
  direction: Direction;
  /** null for a brand-new card (not introduced yet). */
  state: SrsState | null;
}

interface CardRow {
  id: number;
  tr: string;
  en: string;
  pos: string;
  unit: number;
  exTr: string | null;
  exEn: string | null;
  note: string | null;
  softens: number | null;
  harmonyOverride: string | null;
  stem: string | null;
  aorist: string | null;
  flags: string | null;
  source: CardSource;
  seq: number;
  leech: number;
}

export function rowToCard(r: CardRow): Card {
  return {
    id: Number(r.id),
    tr: r.tr,
    en: r.en,
    pos: r.pos,
    unit: Number(r.unit),
    exTr: r.exTr,
    exEn: r.exEn,
    note: r.note,
    softens: r.softens === null ? null : !!r.softens,
    harmonyOverride: r.harmonyOverride,
    stem: r.stem,
    aorist: r.aorist,
    flags: r.flags ? JSON.parse(r.flags) : {},
    source: r.source,
    seq: Number(r.seq),
    leech: !!r.leech,
  };
}

const CARD_COLS = `c.id, c.tr, c.en, c.pos, c.unit, c."exTr", c."exEn", c.note, c.softens, c."harmonyOverride", c.stem, c.aorist, c.flags, c.source, c.seq, c.leech`;

export async function getCard(id: number): Promise<Card | null> {
  const db = await getDb();
  const r = await db.one<CardRow>(`SELECT ${CARD_COLS} FROM cards c WHERE c.id = ?`, [id]);
  return r ? rowToCard(r) : null;
}

/** Number of seed cards introduced today (counts against the daily new-card limit). */
export async function introducedToday(): Promise<number> {
  const { timezone } = await getSettings();
  const since = startOfLocalDayIso(await today(), timezone);
  const db = await getDb();
  const row = await db.one<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM reviews r JOIN cards c ON c.id = r.card_id
     WHERE r.direction = 'en-tr' AND c.source = 'seed' AND r.introduced_at >= ?`,
    [since],
  );
  return Number(row?.n ?? 0);
}

export async function newCardsRemainingToday(): Promise<number> {
  const s = await getSettings();
  return Math.max(0, s.newCardsPerDay - (await introducedToday()));
}

export async function countDue(now = new Date()): Promise<{ due: number; fresh: number }> {
  const db = await getDb();
  const due = await db.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM reviews WHERE due_date <= ?", [now.toISOString()]);
  const unseen = await db.one<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM cards c WHERE c.source = 'seed' AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.card_id = c.id AND r.direction = 'en-tr')",
  );
  return { due: Number(due?.n ?? 0), fresh: Math.min(Number(unseen?.n ?? 0), await newCardsRemainingToday()) };
}

interface DueRow extends CardRow {
  direction: Direction;
  ease: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
}

/** Today's review queue: everything due, then new cards up to the daily limit. */
export async function getReviewSession(now = new Date(), maxDue = 200): Promise<{ due: ReviewItem[]; fresh: ReviewItem[] }> {
  const db = await getDb();
  const dueRows = await db.all<DueRow>(
    `SELECT ${CARD_COLS}, r.direction, r.ease, r.interval_days, r.repetitions, r.lapses
     FROM reviews r JOIN cards c ON c.id = r.card_id
     WHERE r.due_date <= ? ORDER BY r.due_date LIMIT ?`,
    [now.toISOString(), maxDue],
  );
  const due = dueRows.map((r) => ({
    card: rowToCard(r),
    direction: r.direction,
    state: { ease: Number(r.ease), interval: Number(r.interval_days), repetitions: Number(r.repetitions), lapses: Number(r.lapses) },
  }));
  const freshRows = await db.all<CardRow>(
    `SELECT ${CARD_COLS} FROM cards c
     WHERE c.source = 'seed' AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.card_id = c.id AND r.direction = 'en-tr')
     ORDER BY c.seq LIMIT ?`,
    [await newCardsRemainingToday()],
  );
  return { due, fresh: freshRows.map((r) => ({ card: rowToCard(r), direction: "en-tr" as const, state: null })) };
}

export interface RecordReviewInput {
  cardId: number;
  direction: Direction;
  answer: string;
  result: CheckResult;
  msTaken: number;
  grade: Grade;
  context?: "review" | "warmup" | "quiz";
}

/**
 * Log an answer. In the review context this also reschedules the card (SM-2),
 * unlocks the TR → EN direction once learned, and flags leeches.
 */
export async function recordReview(input: RecordReviewInput, now = new Date()) {
  const db = await getDb();
  const ctx = input.context ?? "review";
  return db.tx(async (t) => {
    await t.run(
      `INSERT INTO review_log (card_id, direction, timestamp, answer_given, result, ms_taken, grade, context)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.cardId, input.direction, now.toISOString(), input.answer, input.result, Math.round(input.msTaken), input.grade, ctx],
    );
    if (ctx !== "review") return null;

    const existing = await t.one<{ ease: number; interval_days: number; repetitions: number; lapses: number }>(
      "SELECT ease, interval_days, repetitions, lapses FROM reviews WHERE card_id = ? AND direction = ?",
      [input.cardId, input.direction],
    );
    const state: SrsState = existing
      ? { ease: Number(existing.ease), interval: Number(existing.interval_days), repetitions: Number(existing.repetitions), lapses: Number(existing.lapses) }
      : NEW_CARD_STATE;
    const next = schedule(state, input.grade);
    const due = new Date(dueAt(next, now.getTime())).toISOString();
    if (existing) {
      await t.run(
        `UPDATE reviews SET ease = ?, interval_days = ?, repetitions = ?, lapses = ?, due_date = ?, last_reviewed = ?
         WHERE card_id = ? AND direction = ?`,
        [next.ease, next.interval, next.repetitions, next.lapses, due, now.toISOString(), input.cardId, input.direction],
      );
    } else {
      await t.run(
        `INSERT INTO reviews (card_id, direction, ease, interval_days, repetitions, lapses, due_date, last_reviewed, introduced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.cardId, input.direction, next.ease, next.interval, next.repetitions, next.lapses, due, now.toISOString(), now.toISOString()],
      );
    }
    if (next.isLeech) await t.run("UPDATE cards SET leech = 1 WHERE id = ?", [input.cardId]);
    if (input.direction === "en-tr" && next.repetitions >= LEARNED_REPETITIONS) {
      await t.run(
        `INSERT INTO reviews (card_id, direction, due_date, introduced_at) VALUES (?, 'tr-en', ?, ?) ON CONFLICT DO NOTHING`,
        [input.cardId, new Date(now.getTime() + 86_400_000).toISOString(), now.toISOString()],
      );
    }
    if (next.repetitions >= 2) await t.run("UPDATE mistakes SET resolved = 1 WHERE card_id = ?", [input.cardId]);
    return next;
  });
}

export interface NewCardInput {
  tr: string;
  en: string;
  pos?: string;
  exTr?: string | null;
  exEn?: string | null;
  note?: string | null;
  unit?: number;
}

/**
 * Add cards from a lesson or a writing correction and put them in today's queue.
 * Seed words that were not yet introduced are introduced instead of duplicated.
 */
export async function addCardsToDeck(cards: NewCardInput[], source: Exclude<CardSource, "seed">, now = new Date(), dbIn?: DB): Promise<number[]> {
  const db = dbIn ?? (await getDb());
  const ids: number[] = [];
  await db.tx(async (t) => {
    for (const c of cards) {
      const tr = c.tr.trim();
      if (!tr) continue;
      let id: number | undefined;
      if (source === "lesson") {
        const existing = await t.one<{ id: number }>("SELECT id FROM cards WHERE tr = ? AND source IN ('seed','lesson') ORDER BY id LIMIT 1", [tr]);
        id = existing ? Number(existing.id) : undefined;
      }
      if (id === undefined) {
        const row = await t.one<{ id: number }>(
          `INSERT INTO cards (tr, en, pos, unit, "exTr", "exEn", note, source, seq)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM cards)) RETURNING id`,
          [tr, c.en, c.pos ?? "phrase", c.unit ?? 0, c.exTr ?? null, c.exEn ?? null, c.note ?? null, source],
        );
        id = Number(row!.id);
      }
      await t.run("INSERT INTO reviews (card_id, direction, due_date, introduced_at) VALUES (?, 'en-tr', ?, ?) ON CONFLICT DO NOTHING", [
        id,
        now.toISOString(),
        now.toISOString(),
      ]);
      ids.push(id);
    }
  });
  return ids;
}

/** Cards missed (wrong / almost) in the last `days` days, most-missed first. */
export async function recentMistakeCards(days = 7, limit = 5, now = new Date()): Promise<Card[]> {
  const since = new Date(now.getTime() - days * 86_400_000).toISOString();
  const db = await getDb();
  const rows = await db.all<CardRow>(
    `SELECT ${CARD_COLS} FROM cards c JOIN (
       SELECT card_id, MAX(timestamp) AS last_miss, COUNT(*) AS misses FROM review_log
       WHERE result <> 'correct' AND timestamp >= ? GROUP BY card_id
     ) m ON m.card_id = c.id
     ORDER BY m.misses DESC, m.last_miss DESC LIMIT ?`,
    [since, limit],
  );
  return rows.map(rowToCard);
}

export async function getLeeches(limit = 10): Promise<(Card & { lapses: number })[]> {
  const db = await getDb();
  const rows = await db.all<CardRow & { lapses: number }>(
    `SELECT ${CARD_COLS}, l.lapses FROM cards c JOIN (
       SELECT card_id, MAX(lapses) AS lapses FROM reviews GROUP BY card_id
     ) l ON l.card_id = c.id
     WHERE c.leech = 1 ORDER BY l.lapses DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({ ...rowToCard(r), lapses: Number(r.lapses) }));
}

/** Turkish words the learner has met (introduced cards), most recent first. */
export async function knownWords(limit = 2000): Promise<Card[]> {
  const db = await getDb();
  const rows = await db.all<CardRow>(
    `SELECT ${CARD_COLS} FROM cards c JOIN reviews r ON r.card_id = c.id AND r.direction = 'en-tr'
     WHERE c.source <> 'correction' ORDER BY r.introduced_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(rowToCard);
}

/** Next `n` seed cards that have not been introduced (fallback lesson's "new phrases"). */
export async function nextUnseenSeedCards(n: number): Promise<Card[]> {
  const db = await getDb();
  const rows = await db.all<CardRow>(
    `SELECT ${CARD_COLS} FROM cards c
     WHERE c.source = 'seed' AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.card_id = c.id)
     ORDER BY c.seq LIMIT ?`,
    [n],
  );
  return rows.map(rowToCard);
}

export async function getCardsByIds(ids: number[]): Promise<Card[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.all<CardRow>(`SELECT ${CARD_COLS} FROM cards c WHERE c.id IN (${ids.map(() => "?").join(",")})`, ids);
  const byId = new Map(rows.map((r) => [Number(r.id), rowToCard(r)]));
  return ids.map((id) => byId.get(id)).filter((c): c is Card => !!c);
}

/** Weakest introduced cards (lowest ease) — used to top up the warm-up. */
export async function weakestCardIds(limit = 10): Promise<number[]> {
  const db = await getDb();
  const rows = await db.all<{ card_id: number }>(
    `SELECT card_id FROM reviews WHERE direction = 'en-tr' ORDER BY ease ASC, lapses DESC, due_date ASC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => Number(r.card_id));
}
