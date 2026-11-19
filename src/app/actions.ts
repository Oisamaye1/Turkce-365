"use server";

import { revalidatePath } from "next/cache";
import vocabJson from "../../data/vocab.json";
import type { VocabEntry } from "@/lib/vocab/types";
import { addCardsToDeck, introduceCardNow, knownWords, recordReview, type Direction } from "@/lib/db/cards";
import { recordDrill, unlockStepsUpTo } from "@/lib/db/grammar";
import { completeLesson, getLesson, saveProgress, type LessonProgress } from "@/lib/db/lessons";
import { updateMission } from "@/lib/db/missions";
import { setSetting, today } from "@/lib/db/settings";
import { saveWriting } from "@/lib/db/writing";
import { completeChapter, markRead, recordGame } from "@/lib/db/activity";
import { completeDay, daysCompletedOn, reopenDay, savePlan, setTick } from "@/lib/db/plan";
import { PLAN_DAYS, START_POINTS } from "@/lib/plan/build";
import { getPlanDayView } from "@/lib/plan/status";
import { buildLexicon, generateDrills, type Drill } from "@/lib/grammar/drills";
import { claudeEnabled, detectClaude, runClaudeJson } from "@/lib/claude/cli";
import { correctWriting, type CorrectionOutcome } from "@/lib/lesson/correct";
import { ensureTodayLesson, type GenerateResult } from "@/lib/lesson/generate";
import type { DailyLesson } from "@/lib/lesson/schema";
import { generateWeeklyReport, type QuizResults, type WeeklyReport } from "@/lib/lesson/weekly";
import type { Grade } from "@/lib/srs/sm2";
import type { CheckResult } from "@/lib/turkish/answer";
import { z } from "zod";

const vocab = vocabJson as VocabEntry[];

// ---------------------------------------------------------------- lessons

export async function generateTodayAction(manual = false): Promise<GenerateResult> {
  const res = await ensureTodayLesson({ trigger: manual ? "manual" : "catch-up", ignoreTime: manual });
  revalidatePath("/");
  revalidatePath("/lesson");
  return res;
}

export async function regenerateTodayAction(useClaude = true): Promise<GenerateResult> {
  const res = await ensureTodayLesson({ trigger: "manual", force: true, useClaude });
  revalidatePath("/");
  revalidatePath("/lesson");
  return res;
}

export async function saveLessonProgressAction(date: string, progress: LessonProgress) {
  await saveProgress(date, progress);
}

/** Section 3 of the lesson: the 5 new phrases go into the SRS deck. */
export async function addLessonPhrasesAction(date: string): Promise<number> {
  const row = await getLesson(date);
  if (!row || row.lesson.kind !== "daily") return 0;
  if (row.progress.phrasesAdded) return 0;
  const lesson = row.lesson as DailyLesson;
  const ids = await addCardsToDeck(
    lesson.newPhrases.map((p) => ({ tr: p.tr, en: p.en, exTr: p.exTr ?? null, exEn: p.exEn ?? null, note: p.note ?? null, pos: "phrase" })),
    "lesson",
  );
  await saveProgress(date, { ...row.progress, phrasesAdded: true });
  return ids.length;
}

export async function completeLessonAction(date: string) {
  await completeLesson(date);
  revalidatePath("/");
}

// ---------------------------------------------------------------- reviews

export interface ReviewAnswer {
  cardId: number;
  direction: Direction;
  answer: string;
  result: CheckResult;
  msTaken: number;
  grade: Grade;
  context?: "review" | "warmup" | "quiz";
}

export async function recordReviewAction(a: ReviewAnswer) {
  const next = await recordReview(a);
  return next ? { interval: next.interval, dueInMinutes: next.dueInMinutes, isLeech: next.isLeech } : null;
}

// ---------------------------------------------------------------- suffix drills

export async function getDrillsAction(stepId: number, count = 10): Promise<Drill[]> {
  const known = new Set((await knownWords(3000)).map((c) => c.tr));
  const lex = buildLexicon(vocab, known);
  return generateDrills(stepId, count, lex);
}

export async function recordDrillAction(input: {
  stepId: number;
  result: CheckResult;
  answer: string;
  expected: string;
  prompt: string;
  rules: string[];
  context?: "gym" | "lesson" | "quiz";
}) {
  const r = await recordDrill(input);
  if (r.unlocked) revalidatePath("/gym");
  return r;
}

export async function unlockStepAction(stepId: number) {
  await unlockStepsUpTo(stepId);
  revalidatePath("/gym");
  revalidatePath("/settings");
}

// ---------------------------------------------------------------- writing

export type WritingResult = CorrectionOutcome;

export async function submitWritingAction(input: { prompt: string; text: string; lessonDate?: string }): Promise<WritingResult> {
  const text = input.text.trim();
  if (text.length < 3) return { writingId: 0, correction: null, cardsAdded: 0, error: "Write a few sentences first." };
  const id = await saveWriting(await today(), input.prompt, text);
  if (input.lessonDate) {
    const row = await getLesson(input.lessonDate);
    if (row) await saveProgress(input.lessonDate, { ...row.progress, writingId: id });
  }
  const r = await correctWriting(id);
  revalidatePath("/review");
  revalidatePath("/write");
  return r;
}

export async function retryCorrectionAction(writingId: number): Promise<WritingResult> {
  const r = await correctWriting(writingId);
  revalidatePath("/review");
  return r;
}

// ---------------------------------------------------------------- missions

export async function updateMissionAction(week: string, status: "active" | "done" | "struggled", reflection: string) {
  await updateMission(week, status, reflection.trim() || null);
  revalidatePath("/missions");
  revalidatePath("/");
}

// ---------------------------------------------------------------- weekly check-in

export async function submitWeeklyQuizAction(date: string, results: QuizResults): Promise<WeeklyReport> {
  const row = await getLesson(date);
  if (row) await saveProgress(date, { ...row.progress, quiz: { vocab: results.vocab, drills: results.drills, translation: results.translation.given } });
  const report = await generateWeeklyReport(date, results);
  await completeLesson(date);
  revalidatePath("/progress");
  revalidatePath("/");
  return report;
}

// ---------------------------------------------------------------- settings

const SettingsInput = z.object({
  newCardsPerDay: z.coerce.number().int().min(0).max(100),
  lessonTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(1),
  claudeModel: z.string().max(60).optional(),
  voiceURI: z.string().max(300).optional(),
});

export async function saveSettingsAction(input: z.input<typeof SettingsInput>): Promise<{ ok: boolean; error?: string }> {
  const p = SettingsInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  try {
    new Intl.DateTimeFormat("en", { timeZone: p.data.timezone });
  } catch {
    return { ok: false, error: `Unknown timezone "${p.data.timezone}"` };
  }
  await setSetting("new_cards_per_day", String(p.data.newCardsPerDay));
  await setSetting("lesson_time", p.data.lessonTime);
  await setSetting("timezone", p.data.timezone);
  await setSetting("claude_model", p.data.claudeModel?.trim() ?? "");
  if (p.data.voiceURI !== undefined) await setSetting("voice_uri", p.data.voiceURI);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function checkClaudeAction(testCall: boolean) {
  if (!claudeEnabled()) {
    return {
      caps: {
        available: false,
        bin: "claude",
        version: null,
        flags: { outputFormat: false, jsonSchema: false, tools: false, noSessionPersistence: false, model: false },
        error: "This is the online app — Claude runs on your computer via the worker (npm run worker).",
      },
      test: null,
    };
  }
  const caps = await detectClaude(true);
  if (!testCall || !caps.available) return { caps, test: null };
  const res = await runClaudeJson(
    'Return ONLY JSON: {"tr": "<Turkish for good morning>", "ok": true}',
    z.object({ tr: z.string(), ok: z.boolean() }),
    { jsonSchema: { type: "object", required: ["tr", "ok"], properties: { tr: { type: "string" }, ok: { type: "boolean" } } }, timeoutMs: 120_000 },
  );
  return { caps, test: res.ok ? { ok: true, text: res.data.tr, ms: res.ms } : { ok: false, text: res.error, ms: res.ms } };
}

export async function buildReportNowAction() {
  await generateWeeklyReport(await today(), null);
  revalidatePath("/progress");
}

// ---------------------------------------------------------------- learning plan

const PlanInput = z.object({
  start: z.enum(["zero", "basics", "survival", "a2"]),
  daysPerWeek: z.number().int().min(3).max(7),
});

export async function createPlanAction(input: z.input<typeof PlanInput>): Promise<{ ok: boolean; startDay?: number; error?: string }> {
  const p = PlanInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Choose where to start and how many days a week." };
  const sp = START_POINTS.find((x) => x.id === p.data.start)!;
  const cfg = await savePlan({ startDay: sp.day, startedOn: await today(), daysPerWeek: p.data.daysPerWeek }, { reset: true });
  revalidatePath("/", "layout");
  return { ok: true, startDay: cfg.startDay };
}

const TICK_KEYS = ["learn", "reviews", "lesson", "drills", "write", "mission", "selfcheck", "challenge"] as const;

export async function planTickAction(day: number, key: string, value: string | null): Promise<{ ok: boolean }> {
  if (!TICK_KEYS.includes(key as (typeof TICK_KEYS)[number]) || !Number.isInteger(day) || day < 1 || day > PLAN_DAYS) return { ok: false };
  if (value !== null && !/^[a-z]{2,12}$/.test(value)) return { ok: false };
  await setTick(day, key, value);
  revalidatePath("/");
  revalidatePath("/plan", "layout");
  return { ok: true };
}

export async function finishPlanDayAction(day: number): Promise<{ ok: boolean; next?: number; finishedToday?: number; error?: string }> {
  const view = await getPlanDayView(day);
  if (!view) return { ok: false, error: "No plan yet." };
  if (!view.canFinish) return { ok: false, error: "Finish the remaining tasks first, or mark them as done." };
  const date = await today();
  await completeDay(day, date);
  revalidatePath("/", "layout");
  return { ok: true, next: Math.min(PLAN_DAYS, day + 1), finishedToday: (await daysCompletedOn(date)).length };
}

export async function reopenPlanDayAction(day: number) {
  if (!Number.isInteger(day)) return;
  await reopenDay(day);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- practice, learn, read

const ACTIVITY_ID = /^[a-z0-9-]{2,40}$/;

export async function recordGameAction(id: string, score: number) {
  if (!ACTIVITY_ID.test(id) || !Number.isFinite(score) || score < 0 || score > 100_000) return null;
  const r = await recordGame(id, Math.round(score));
  revalidatePath("/practice");
  return r;
}

export async function completeChapterAction(id: string, score: number, total: number) {
  if (!ACTIVITY_ID.test(id) || !Number.isInteger(score) || !Number.isInteger(total) || score < 0 || score > total || total > 50) return;
  await completeChapter(id, score, total);
  revalidatePath("/learn", "layout");
}

export async function markReadAction(id: string) {
  if (!ACTIVITY_ID.test(id)) return;
  await markRead(id);
  revalidatePath("/read", "layout");
}

/** Start learning a word now from the dictionary (it joins today's reviews). */
export async function learnWordNowAction(cardId: number) {
  if (!Number.isInteger(cardId)) return { ok: false };
  const ok = await introduceCardNow(cardId);
  revalidatePath("/words");
  revalidatePath("/review");
  return { ok };
}
