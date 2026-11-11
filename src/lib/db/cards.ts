import { getDb } from "./index";
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
    ...r,
    softens: r.softens === null ? null : !!r.softens,
    flags: r.flags ? JSON.parse(r.flags) : {},
    leech: !!r.leech,
  };
}

const CARD_COLS = "c.id, c.tr, c.en, c.pos, c.unit, c.exTr, c.exEn, c.note, c.softens, c.harmonyOverride, c.stem, c.aorist, c.flags, c.source, c.seq, c.leech";

export function getCard(id: number): Card | null {
  const r = getDb().prepare(`SELECT ${CARD_COLS} FROM cards c WHERE c.id = ?`).get(id) as CardRow | undefined;
  return r ? rowToCard(r) : null;
}

export function findCardByTr(tr: string): Card | null {
  const r = getDb().prepare(`SELECT ${CARD_COLS} FROM cards c WHERE c.tr = ? ORDER BY c.source = 'seed' DESC, c.id LIMIT 1`).get(tr) as
    | CardRow
    | undefined;
  return r ? rowToCard(r) : null;
}

/** Number of seed cards introduced today (counts against the daily new-card limit). */
export function introducedToday(): number {
  const { timezone } = getSettings();
  const since = startOfLocalDayIso(today(), timezone);
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM reviews r JOIN cards c ON c.id = r.card_id
       WHERE r.direction = 'en-tr' AND c.source = 'seed' AND r.introduced_at >= ?`,
    )
    .get(since) as { n: number };
  return row.n;
}

export function newCardsRemainingToday(): number {
  return Math.max(0, getSettings().newCardsPerDay - introducedToday());
}

export function countDue(now = new Date()): { due: number; fresh: number } {
  const due = (getDb().prepare("SELECT COUNT(*) AS n FROM reviews WHERE due_date <= ?").get(now.toISOString()) as { n: number }).n;
  const unseen = (
    getDb()
      .prepare(
        "SELECT COUNT(*) AS n FROM cards c WHERE c.source = 'seed' AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.card_id = c.id AND r.direction = 'en-tr')",
      )
      .get() as { n: number }
  ).n;
  return { due, fresh: Math.min(unseen, newCardsRemainingToday()) };
}

interface DueRow extends CardRow {
  direction: Direction;
  ease: number;
  interval: number;
  repetitions: number;
  lapses: number;
}

/** Today's review queue: everything due, then new cards up to the daily limit. */
export function getReviewSession(now = new Date(), maxDue = 200): { due: ReviewItem[]; fresh: ReviewItem[] } {
  const db = getDb();
  const dueRows = db
    .prepare(
      `SELECT ${CARD_COLS}, r.direction, r.ease, r.interval, r.repetitions, r.lapses
       FROM reviews r JOIN cards c ON c.id = r.card_id
       WHERE r.due_date <= ? ORDER BY r.due_date LIMIT ?`,
    )
    .all(now.toISOString(), maxDue) as DueRow[];
  const due = dueRows.map((r) => ({
    card: rowToCard(r),
    direction: r.direction,
    state: { ease: r.ease, interval: r.interval, repetitions: r.repetitions, lapses: r.lapses },
  }));
  const freshRows = db
    .prepare(
      `SELECT ${CARD_COLS} FROM cards c
       WHERE c.source = 'seed' AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.card_id = c.id AND r.direction = 'en-tr')
       ORDER BY c.seq LIMIT ?`,
    )
    .all(newCardsRemainingToday()) as CardRow[];
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
export function recordReview(input: RecordReviewInput, now = new Date()) {
  const db = getDb();
  const ctx = input.context ?? "review";
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO review_log (card_id, direction, timestamp, answer_given, result, ms_taken, grade, context)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(input.cardId, input.direction, now.toISOString(), input.answer, input.result, input.msTaken, input.grade, ctx);
    if (ctx !== "review") return null;

    const existing = db
      .prepare("SELECT ease, interval, repetitions, lapses FROM reviews WHERE card_id = ? AND direction = ?")
      .get(input.cardId, input.direction) as SrsState | undefined;
    const state = existing ?? NEW_CARD_STATE;
    const next = schedule(state, input.grade);
    const due = new Date(dueAt(next, now.getTime())).toISOString();
    if (existing) {
      db.prepare(
        `UPDATE reviews SET ease = ?, interval = ?, repetitions = ?, lapses = ?, due_date = ?, last_reviewed = ?
         WHERE card_id = ? AND direction = ?`,
      ).run(next.ease, next.interval, next.repetitions, next.lapses, due, now.toISOString(), input.cardId, input.direction);
    } else {
      db.prepare(
        `INSERT INTO reviews (card_id, direction, ease, interval, repetitions, lapses, due_date, last_reviewed, introduced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(input.cardId, input.direction, next.ease, next.interval, next.repetitions, next.lapses, due, now.toISOString(), now.toISOString());
    }
    if (next.isLeech) db.prepare("UPDATE cards SET leech = 1 WHERE id = ?").run(input.cardId);
    // Learned → also review it Turkish → English from tomorrow.
    if (input.direction === "en-tr" && next.repetitions >= LEARNED_REPETITIONS) {
      db.prepare(
        `INSERT OR IGNORE INTO reviews (card_id, direction, due_date, introduced_at) VALUES (?, 'tr-en', ?, ?)`,
      ).run(input.cardId, new Date(now.getTime() + 86_400_000).toISOString(), now.toISOString());
    }
    // A correction card answered right twice in a row resolves its mistake.
    if (next.repetitions >= 2) db.prepare("UPDATE mistakes SET resolved = 1 WHERE card_id = ?").run(input.cardId);
    return next;
  });
  return tx();
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
export function addCardsToDeck(cards: NewCardInput[], source: Exclude<CardSource, "seed">, now = new Date()): number[] {
  const db = getDb();
  const ids: number[] = [];
  const tx = db.transaction(() => {
    for (const c of cards) {
      const tr = c.tr.trim();
      if (!tr) continue;
      let id: number | undefined;
      if (source === "lesson") {
        const existing = db.prepare("SELECT id FROM cards WHERE tr = ? AND source IN ('seed','lesson') ORDER BY id LIMIT 1").get(tr) as
          | { id: number }
          | undefined;
        id = existing?.id;
      }
      if (id === undefined) {
        id = Number(
          db
            .prepare(
              `INSERT INTO cards (tr, en, pos, unit, exTr, exEn, note, source, seq)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM cards))`,
            )
            .run(tr, c.en, c.pos ?? "phrase", c.unit ?? 0, c.exTr ?? null, c.exEn ?? null, c.note ?? null, source).lastInsertRowid,
        );
      }
      db.prepare("INSERT OR IGNORE INTO reviews (card_id, direction, due_date, introduced_at) VALUES (?, 'en-tr', ?, ?)").run(
        id,
        now.toISOString(),
        now.toISOString(),
      );
      ids.push(id);
    }
  });
  tx();
  return ids;
}

/** Cards missed (wrong / almost) in the last `days` days, most recent first. */
export function recentMistakeCards(days = 7, limit = 5, now = new Date()): Card[] {
  const since = new Date(now.getTime() - days * 86_400_000).toISOString();
  const rows = getDb()
    .prepare(
      `SELECT ${CARD_COLS}, MAX(l.timestamp) AS last_miss, COUNT(*) AS misses
       FROM review_log l JOIN cards c ON c.id = l.card_id
       WHERE l.result != 'correct' AND l.timestamp >= ?
       GROUP BY c.id ORDER BY misses DESC, last_miss DESC LIMIT ?`,
    )
    .all(since, limit) as CardRow[];
  return rows.map(rowToCard);
}

export function getLeeches(limit = 10): (Card & { lapses: number })[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CARD_COLS}, MAX(r.lapses) AS lapses FROM cards c JOIN reviews r ON r.card_id = c.id
       WHERE c.leech = 1 GROUP BY c.id ORDER BY lapses DESC LIMIT ?`,
    )
    .all(limit) as (CardRow & { lapses: number })[];
  return rows.map((r) => ({ ...rowToCard(r), lapses: r.lapses }));
}

/** Turkish words the learner has met (introduced cards), most recent first. */
export function knownWords(limit = 2000): Card[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CARD_COLS} FROM cards c JOIN reviews r ON r.card_id = c.id AND r.direction = 'en-tr'
       WHERE c.source != 'correction' ORDER BY r.introduced_at DESC LIMIT ?`,
    )
    .all(limit) as CardRow[];
  return rows.map(rowToCard);
}

/** Next `n` seed cards that have not been introduced (fallback lesson's "new phrases"). */
export function nextUnseenSeedCards(n: number): Card[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CARD_COLS} FROM cards c
       WHERE c.source = 'seed' AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.card_id = c.id)
       ORDER BY c.seq LIMIT ?`,
    )
    .all(n) as CardRow[];
  return rows.map(rowToCard);
}

/** Highest unit the learner has started. */
export function currentUnit(): number {
  const r = getDb()
    .prepare(
      `SELECT COALESCE(MAX(c.unit), 1) AS u FROM cards c JOIN reviews r ON r.card_id = c.id WHERE c.source = 'seed'`,
    )
    .get() as { u: number };
  return Math.max(1, r.u);
}

export function getCardsByIds(ids: number[]): Card[] {
  if (!ids.length) return [];
  const rows = getDb()
    .prepare(`SELECT ${CARD_COLS} FROM cards c WHERE c.id IN (${ids.map(() => "?").join(",")})`)
    .all(...ids) as CardRow[];
  const byId = new Map(rows.map((r) => [r.id, rowToCard(r)]));
  return ids.map((id) => byId.get(id)).filter((c): c is Card => !!c);
}
