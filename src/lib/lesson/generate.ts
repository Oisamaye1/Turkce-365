/**
 * Daily lesson pipeline (used by scripts/generate-lesson.ts at 05:30 and by the app's catch-up):
 *   read progress → `claude -p` → Zod validation → save → (notification by the caller)
 *   ↳ on any failure: build a lesson from local content so a day is never lost.
 * Sunday → weekly check-in instead.  Monday → also creates the week's mission.
 */
import { getDb } from "@/lib/db";
import { getLeeches, knownWords, nextUnseenSeedCards, recentMistakeCards } from "@/lib/db/cards";
import { currentGrammarStep } from "@/lib/db/grammar";
import { finishJob, isJobRunning, startJob, type JobTrigger } from "@/lib/db/jobs";
import { getLesson, listLessons, saveLesson, usedDialogueIds, type LessonRow } from "@/lib/db/lessons";
import { ensureMission, recentStruggles } from "@/lib/db/missions";
import { getSettings } from "@/lib/db/settings";
import { recentMistakes } from "@/lib/db/writing";
import { getStep } from "@/lib/grammar/steps";
import { runClaudeJson } from "@/lib/claude/cli";
import { addDays, isAfterLessonTime, isSunday, localDate } from "@/lib/time";
import { buildFallbackContent } from "./fallback";
import { buildLessonPrompt, learnerLevel } from "./prompt";
import { LESSON_JSON_SCHEMA, LessonContentSchema, type DailyLesson, type LessonContent } from "./schema";
import { buildWeeklyQuiz } from "./weekly";

export interface GenerateOptions {
  trigger: JobTrigger;
  /** Regenerate even if today's lesson exists. */
  force?: boolean;
  /** Generate even before the lesson time (manual "generate now"). */
  ignoreTime?: boolean;
  /** Set false to skip Claude and use the local fallback directly. */
  useClaude?: boolean;
  now?: Date;
}

export interface GenerateResult {
  status: "exists" | "created" | "skipped" | "busy" | "error";
  date: string;
  kind?: "daily" | "weekly";
  source?: "claude" | "fallback";
  message: string;
}

const inflight = new Map<string, Promise<GenerateResult>>();

export async function ensureTodayLesson(opts: GenerateOptions): Promise<GenerateResult> {
  const settings = getSettings();
  const now = opts.now ?? new Date();
  const date = localDate(now, settings.timezone);
  if (!opts.force && getLesson(date)) return { status: "exists", date, message: "Today's lesson already exists." };
  if (!opts.force && !opts.ignoreTime && !isAfterLessonTime(now, settings.lessonTime, settings.timezone)) {
    return { status: "skipped", date, message: `Too early — lessons are generated at ${settings.lessonTime} (${settings.timezone}).` };
  }
  const pending = inflight.get(date);
  if (pending) return pending;
  if (isJobRunning("lesson")) return { status: "busy", date, message: "A lesson is already being generated." };
  const p = generate(date, opts).finally(() => inflight.delete(date));
  inflight.set(date, p);
  return p;
}

async function generate(date: string, opts: GenerateOptions): Promise<GenerateResult> {
  const job = startJob("lesson", opts.trigger);
  try {
    // A mission for this week (created on Monday — or on first use mid-week).
    ensureMission(date);

    if (isSunday(date)) {
      saveLesson(buildWeeklyQuiz(date));
      finishJob(job, "ok", `Weekly check-in for ${date}`);
      return { status: "created", date, kind: "weekly", source: "fallback", message: "Weekly check-in ready." };
    }

    const step = getStep(currentGrammarStep());
    const known = knownWords(1500);
    const warmup = recentMistakeCards(7, 5).map((c) => c.id);
    if (warmup.length < 5) {
      // Top up with weakest known cards.
      const weak = getDb()
        .prepare(
          `SELECT card_id FROM reviews WHERE direction = 'en-tr' ORDER BY ease ASC, lapses DESC, due_date ASC LIMIT 10`,
        )
        .all() as { card_id: number }[];
      for (const w of weak) if (warmup.length < 5 && !warmup.includes(w.card_id)) warmup.push(w.card_id);
    }
    const leeches = getLeeches(3);
    const base = {
      kind: "daily" as const,
      date,
      grammarStepId: step.id,
      warmupCardIds: warmup,
      drillSeed: `${date}-${step.id}`,
    };

    let content: LessonContent | null = null;
    let source: "claude" | "fallback" = "fallback";
    let note = "";
    if (opts.useClaude !== false) {
      const sevenDaysAgo = addDays(date, -7);
      const vocabMisses = recentMistakeCards(7, 10).map((c) => `${c.tr} (${c.en})`);
      const writingMisses = recentMistakes(sevenDaysAgo, 10).map((m) => `[${m.ruleTag}] "${m.original}" → "${m.correction}"`);
      const prompt = buildLessonPrompt({
        date,
        level: learnerLevel(known.length, step.id),
        grammarStep: step,
        knownWords: sample(known.filter((c) => c.source !== "correction").map((c) => c.tr), 150),
        mistakes: [...writingMisses, ...vocabMisses],
        leeches: leeches.map((l) => ({ tr: l.tr, en: l.en })),
        missionStruggles: recentStruggles(),
        recentTitles: listLessons(7).map((l) => ("title" in l.lesson ? l.lesson.title : "")).filter(Boolean),
      });
      const res = await runClaudeJson(prompt, LessonContentSchema, {
        jsonSchema: LESSON_JSON_SCHEMA,
        timeoutMs: 300_000,
        model: getSettings().claudeModel,
      });
      if (res.ok) {
        content = res.data;
        source = "claude";
        note = `generated by Claude in ${Math.round(res.ms / 1000)}s`;
      } else {
        note = res.error;
      }
    } else {
      note = "Claude skipped";
    }

    let dialogueId: string | undefined;
    if (!content) {
      const inDeck = new Set(known.map((c) => c.tr));
      const fb = buildFallbackContent({
        step,
        usedDialogueIds: usedDialogueIds(),
        nextWords: nextUnseenSeedCards(5),
        inDeck,
        leeches,
      });
      dialogueId = fb.dialogueId;
      content = fb;
    }

    const lesson: DailyLesson & { dialogueId?: string } = { ...content, ...base, source, ...(dialogueId ? { dialogueId } : {}) };
    saveLesson(lesson);
    finishJob(job, source === "claude" ? "ok" : "fallback", source === "claude" ? note : `Used local fallback: ${note}`);
    return {
      status: "created",
      date,
      kind: "daily",
      source,
      message: source === "claude" ? "Today's lesson is ready." : `Offline lesson created (${note}).`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    finishJob(job, "error", msg);
    return { status: "error", date, message: msg };
  }
}

function sample<T>(xs: T[], n: number): T[] {
  if (xs.length <= n) return xs;
  // Most recent half + random older half.
  const recent = xs.slice(0, Math.floor(n / 2));
  const rest = xs.slice(Math.floor(n / 2));
  const picked: T[] = [];
  const used = new Set<number>();
  while (picked.length < n - recent.length) {
    const i = Math.floor(Math.random() * rest.length);
    if (!used.has(i)) {
      used.add(i);
      picked.push(rest[i]);
    }
  }
  return [...recent, ...picked];
}

export type { LessonRow };
