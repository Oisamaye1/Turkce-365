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

export function buildWeeklyQuiz(date: string): WeeklyQuiz {
  const { timezone } = getSettings();
  const weekStart = mondayOf(date);
  const sinceIso = startOfLocalDayIso(weekStart, timezone);
  const rows = getDb()
    .prepare(
      `SELECT l.card_id AS id, SUM(l.result != 'correct') AS misses, COUNT(*) AS n
       FROM review_log l JOIN cards c ON c.id = l.card_id
       WHERE l.timestamp >= ? AND c.source != 'correction'
       GROUP BY l.card_id ORDER BY misses DESC, n DESC LIMIT 40`,
    )
    .all(sinceIso) as { id: number }[];
  let ids = rows.map((r) => r.id);
  // Keep the most-missed half, then shuffle in the rest for variety.
  ids = [...ids.slice(0, 8), ...shuffle(ids.slice(8))].slice(0, 15);
  if (ids.length < 15) {
    for (const c of knownWords(200)) {
      if (ids.length >= 15) break;
      if (!ids.includes(c.id)) ids.push(c.id);
    }
  }
  const translation = pickTranslation(weekStart, date, getCardsByIds(ids));
  return {
    kind: "weekly",
    date,
    source: "fallback",
    weekStart,
    vocabCardIds: ids,
    drillSeed: `weekly-${date}`,
    maxStep: currentGrammarStep(),
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

function pickTranslation(from: string, to: string, cards: Card[]): { en: string; tr: string } {
  const lines = lessonsBetween(from, to)
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
  const { timezone } = getSettings();
  const week = mondayOf(date);
  const sinceIso = startOfLocalDayIso(week, timezone);
  const untilIso = startOfLocalDayIso(addDays(week, 7), timezone);
  const ret = retention(sinceIso, untilIso);
  const s = streak();
  const base = {
    week,
    generatedAt: new Date().toISOString(),
    wordsTotal: wordsLearned(),
    wordsThisWeek: wordsLearned(sinceIso, untilIso),
    retention: ret.rate,
    reviewsThisWeek: ret.reviews,
    suffixAccuracy: stepAccuracySince(sinceIso, untilIso).map((x) => ({ ...x, title: getStep(x.stepId).title })),
    topMistakes: topMistakes(sinceIso, week, 3),
    streak: { current: s.current, best: s.best },
    quiz,
    activity: dailyActivity(7),
  };
  let narrative = localNarrative(base);
  let narrativeSource: "claude" | "local" = "local";
  if (opts.useClaude !== false) {
    const summary = JSON.stringify(
      { ...base, activity: undefined, retention: Math.round(base.retention * 100) + "%" },
      null,
      1,
    );
    const res = await runClaudeJson(buildReportPrompt(summary), ReportNarrativeSchema, {
      jsonSchema: REPORT_JSON_SCHEMA,
      timeoutMs: 120_000,
      model: getSettingsModel(),
    });
    if (res.ok) {
      narrative = res.data;
      narrativeSource = "claude";
    }
  }
  const report: WeeklyReport = { ...base, ...narrative, narrativeSource };
  getDb()
    .prepare("INSERT INTO weekly_reports (week, json) VALUES (?, ?) ON CONFLICT(week) DO UPDATE SET json = excluded.json, created_at = datetime('now')")
    .run(week, JSON.stringify(report));
  return report;
}

function getSettingsModel(): string | null {
  return getSettings().claudeModel;
}

export function listReports(): WeeklyReport[] {
  return (getDb().prepare("SELECT json FROM weekly_reports ORDER BY week DESC").all() as { json: string }[]).map((r) => JSON.parse(r.json));
}
