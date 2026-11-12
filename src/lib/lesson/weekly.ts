/** Sunday check-in: quiz builder and weekly progress report. */
import { getDb } from "@/lib/db";
import { getCardsByIds, knownWords, type Card } from "@/lib/db/cards";
import { currentGrammarStep, stepAccuracySince } from "@/lib/db/grammar";
import { lessonsBetween } from "@/lib/db/lessons";
import { getSettings } from "@/lib/db/settings";
import { dailyActivity, retention, streak, topMistakes, wordsLearned, type DayActivity, type RecurringMistake } from "@/lib/db/stats";
import { getStep } from "@/lib/grammar/steps";
import { runClaudeJson } from "@/lib/claude/cli";
import { addDays, mondayOf, startOfLocalDayIso } from "@/lib/time";
import { REPORT_JSON_SCHEMA, ReportNarrativeSchema, type DailyLesson, type WeeklyQuiz } from "./schema";
import { buildReportPrompt } from "./prompt";

export async function buildWeeklyQuiz(date: string): Promise<WeeklyQuiz> {
  const { timezone } = await getSettings();
  const weekStart = mondayOf(date);
  const sinceIso = startOfLocalDayIso(weekStart, timezone);
  const db = await getDb();
  const rows = await db.all<{ id: number }>(
    `SELECT l.card_id AS id, COUNT(*) FILTER (WHERE l.result <> 'correct') AS misses, COUNT(*) AS n
     FROM review_log l JOIN cards c ON c.id = l.card_id
     WHERE l.timestamp >= ? AND c.source <> 'correction'
     GROUP BY l.card_id ORDER BY misses DESC, n DESC LIMIT 40`,
    [sinceIso],
  );
  let ids = rows.map((r) => Number(r.id));
  // Keep the most-missed half, then shuffle in the rest for variety.
  ids = [...ids.slice(0, 8), ...shuffle(ids.slice(8))].slice(0, 15);
  if (ids.length < 15) {
    for (const c of await knownWords(200)) {
      if (ids.length >= 15) break;
      if (!ids.includes(c.id)) ids.push(c.id);
    }
  }
  const translation = await pickTranslation(weekStart, date, await getCardsByIds(ids));
  return {
    kind: "weekly",
    date,
    source: "fallback",
    weekStart,
    vocabCardIds: ids,
    drillSeed: `weekly-${date}`,
    maxStep: await currentGrammarStep(),
    translation,
    title: "Weekly check-in",
    titleTr: "Haftalık değerlendirme",
  };
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function pickTranslation(from: string, to: string, cards: Card[]): Promise<{ en: string; tr: string }> {
  const lines = (await lessonsBetween(from, to))
    .filter((l) => l.lesson.kind === "daily")
    .flatMap((l) => (l.lesson as DailyLesson).dialogue.lines)
    .filter((l) => l.tr.split(/\s+/).length >= 3 && l.tr.split(/\s+/).length <= 9);
  if (lines.length) {
    const l = lines[Math.floor(Math.random() * lines.length)];
    return { en: l.en, tr: l.tr };
  }
  const withEx = cards.filter((c) => c.exTr && c.exEn);
  if (withEx.length) {
    const c = withEx[Math.floor(Math.random() * withEx.length)];
    return { en: c.exEn!, tr: c.exTr! };
  }
  return { en: "Hello, how are you?", tr: "Merhaba, nasılsın?" };
}

export interface QuizResults {
  vocab: { correct: number; total: number };
  drills: { correct: number; total: number };
  translation: { given: string; reference: string; result: string };
}

export interface WeeklyReport {
  week: string;
  generatedAt: string;
  wordsTotal: number;
  wordsThisWeek: number;
  retention: number;
  reviewsThisWeek: number;
  suffixAccuracy: { stepId: number; title: string; attempts: number; accuracy: number }[];
  topMistakes: RecurringMistake[];
  streak: { current: number; best: number };
  quiz: QuizResults | null;
  focusAreas: string[];
  encouragement: string;
  narrativeSource: "claude" | "local";
  activity: DayActivity[];
}

function localNarrative(r: Omit<WeeklyReport, "focusAreas" | "encouragement" | "narrativeSource">): { focusAreas: string[]; encouragement: string } {
  const focus: string[] = [];
  const weakest = [...r.suffixAccuracy].filter((s) => s.attempts >= 5).sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weakest && weakest.accuracy < 0.85) focus.push(`Drill "${weakest.title}" in the Suffix Gym until you're above 90 % (now ${Math.round(weakest.accuracy * 100)} %).`);
  const ruleMistake = r.topMistakes.find((m) => m.kind === "rule");
  if (ruleMistake) focus.push(`Your most frequent error this week was "${ruleMistake.label}" — re-read its rule and write 3 sentences using it.`);
  const wordMistake = r.topMistakes.find((m) => m.kind === "word");
  if (wordMistake) focus.push(`Make a mnemonic for ${wordMistake.label} and use it in a real conversation.`);
  if (r.retention && r.retention < 0.8) focus.push("Retention is below 80 % — keep reviews daily and lower new cards per day for a week.");
  if (focus.length < 2) focus.push("Keep the streak going: reviews first, then the lesson, every morning.");
  if (focus.length < 2) focus.push("Try this week's mission early in the week so you can repeat it.");
  const encouragement =
    r.streak.current >= 7
      ? `A ${r.streak.current}-day streak — harika! Consistency is exactly what makes Turkish stick.`
      : "Her gün biraz — a little every day. You're building a real habit, keep going!";
  return { focusAreas: focus.slice(0, 3), encouragement };
}

/** Build the report for the week ending on `date` (a Sunday) and store it. */
export async function generateWeeklyReport(date: string, quiz: QuizResults | null, opts: { useClaude?: boolean } = {}): Promise<WeeklyReport> {
  const { timezone } = await getSettings();
  const week = mondayOf(date);
  const sinceIso = startOfLocalDayIso(week, timezone);
  const untilIso = startOfLocalDayIso(addDays(week, 7), timezone);
  const ret = await retention(sinceIso, untilIso);
  const s = await streak();
  const base = {
    week,
    generatedAt: new Date().toISOString(),
    wordsTotal: await wordsLearned(),
    wordsThisWeek: await wordsLearned(sinceIso, untilIso),
    retention: ret.rate,
    reviewsThisWeek: ret.reviews,
    suffixAccuracy: (await stepAccuracySince(sinceIso, untilIso)).map((x) => ({ ...x, title: getStep(x.stepId).title })),
    topMistakes: await topMistakes(sinceIso, week, 3),
    streak: { current: s.current, best: s.best },
    quiz,
    activity: await dailyActivity(7),
  };
  return saveReport(base, opts.useClaude !== false);
}

type ReportBase = Omit<WeeklyReport, "focusAreas" | "encouragement" | "narrativeSource">;

async function saveReport(base: ReportBase, useClaude: boolean): Promise<WeeklyReport> {
  let narrative = localNarrative(base);
  let narrativeSource: "claude" | "local" = "local";
  if (useClaude) {
    const summary = JSON.stringify(
      { ...base, activity: undefined, retention: Math.round(base.retention * 100) + "%" },
      null,
      1,
    );
    const res = await runClaudeJson(buildReportPrompt(summary), ReportNarrativeSchema, {
      jsonSchema: REPORT_JSON_SCHEMA,
      timeoutMs: 120_000,
      model: (await getSettings()).claudeModel,
    });
    if (res.ok) {
      narrative = res.data;
      narrativeSource = "claude";
    }
  }
  const report: WeeklyReport = { ...base, ...narrative, narrativeSource };
  const db = await getDb();
  await db.run("INSERT INTO weekly_reports (week, json) VALUES (?, ?) ON CONFLICT (week) DO UPDATE SET json = excluded.json, created_at = excluded.created_at", [
    base.week,
    JSON.stringify(report),
  ]);
  return report;
}

export async function listReports(): Promise<WeeklyReport[]> {
  const db = await getDb();
  return (await db.all<{ json: string }>("SELECT json FROM weekly_reports ORDER BY week DESC")).map((r) => JSON.parse(r.json));
}

/** Worker: replace locally-written report notes (made while Claude was unreachable) with Claude's. */
export async function upgradeReportNarratives(): Promise<number> {
  let n = 0;
  for (const r of (await listReports()).slice(0, 2)) {
    if (r.narrativeSource === "claude") continue;
    const { focusAreas: _f, encouragement: _e, narrativeSource: _n, ...base } = r;
    const next = await saveReport(base, true);
    if (next.narrativeSource === "claude") n++;
  }
  return n;
}
