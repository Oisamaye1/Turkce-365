/**
 * Assembles the 365-day plan from the curriculum. Pure functions only: the same day
 * number always gives the same day, so the plan never needs storing, only progress.
 *
 * Week rhythm (7 plan days):
 *   1 Learn  · 2 Drill · 3 Listen · 4 Learn more · 5 Write · 6 Out in the world · 7 Check-in
 * Day 365 is graduation.
 */
import { getStep } from "@/lib/grammar/steps";
import {
  CHECKIN_CHALLENGES,
  CONCEPTS,
  DRILL_CHALLENGES,
  LISTEN_CHALLENGES,
  STAGES,
  WEEKS,
  type PlanWeek,
  type Stage,
} from "./curriculum";

export const PLAN_DAYS = 365;
export const PLAN_WEEKS = 52;
export const TOTAL_WORDS = 1500;

export type DayKind = "learn" | "drill" | "listen" | "learn2" | "write" | "out" | "checkin" | "graduation";
export const DAY_KINDS: DayKind[] = ["learn", "drill", "listen", "learn2", "write", "out", "checkin"];
export const DAY_KIND_LABEL: Record<DayKind, { en: string; tr: string }> = {
  learn: { en: "Learn", tr: "Öğren" },
  drill: { en: "Drill", tr: "Alıştırma" },
  listen: { en: "Listen", tr: "Dinle" },
  learn2: { en: "Learn more", tr: "Devam" },
  write: { en: "Write", tr: "Yaz" },
  out: { en: "Out there", tr: "Dışarıda" },
  checkin: { en: "Check-in", tr: "Değerlendirme" },
  graduation: { en: "Graduation", tr: "Mezuniyet" },
};

export type TaskKind = "learn" | "reviews" | "lesson" | "drills" | "write" | "mission" | "selfcheck" | "challenge";

export interface PlanTask {
  key: TaskKind;
  title: string;
  detail?: string;
  href?: string;
  minutes: number;
  optional?: boolean;
  /** Can't be detected from activity: ticked by hand. */
  manual?: boolean;
}

export interface PlanConcept {
  id: string;
  title: string;
  titleTr: string;
  body: string;
  examples: { tr: string; en: string; breakdown?: string }[];
  /** Set when the concept is one of the 16 drillable grammar steps. */
  stepId?: number;
  /** A page in the app that goes deeper. */
  link?: { href: string; label: string };
}

const CONCEPT_LINKS: Record<string, { href: string; label: string }> = {
  alphabet: { href: "/alphabet", label: "Hear every letter" },
  harmony: { href: "/alphabet", label: "See vowel harmony tables" },
};

export interface PlanDay {
  day: number;
  week: number;
  /** 0–6 inside the week (6 = check-in). */
  index: number;
  kind: DayKind;
  stage: Stage;
  weekInfo: PlanWeek;
  title: string;
  titleTr: string;
  concept?: PlanConcept;
  /** Grammar step this day drills. */
  step: number;
  /** Step introduced in this week, if any. */
  newStep?: number;
  /** New words today: positions [from, to) in the 1,500-word list. */
  words: { from: number; to: number };
  challenge: string;
  tasks: PlanTask[];
  minutes: number;
}

// ── Words: lighter in the first weeks, none in the last two (consolidation) ─────
const FIRST_WEEKS = [12, 15, 20, 20];
const WEEK_WORDS: number[] = (() => {
  const rest = TOTAL_WORDS - FIRST_WEEKS.reduce((a, b) => a + b, 0);
  const n = PLAN_WEEKS - FIRST_WEEKS.length - 2;
  const mid = Array.from({ length: n }, (_, i) => Math.floor((rest * (i + 1)) / n) - Math.floor((rest * i) / n));
  return [...FIRST_WEEKS, ...mid, 0, 0];
})();

/** Words introduced on each of days 1–5 of every week; cumulative start index per day. */
const DAY_WORD_START: number[] = (() => {
  const starts: number[] = [];
  let acc = 0;
  for (let w = 0; w < PLAN_WEEKS; w++) {
    const c = WEEK_WORDS[w];
    for (let d = 0; d < 7; d++) {
      starts.push(acc);
      if (d < 5) acc += Math.floor((c * (d + 1)) / 5) - Math.floor((c * d) / 5);
    }
  }
  starts.push(acc); // day 365
  starts.push(acc); // end sentinel
  return starts;
})();

/** Total words introduced by the end of plan day `day` (1-based). */
export function wordsThrough(day: number): number {
  const d = Math.max(0, Math.min(PLAN_DAYS, day));
  return DAY_WORD_START[d] ?? TOTAL_WORDS;
}

// ── Grammar ──────────────────────────────────────────────────────────────
/** The order the plan introduces the 16 suffix steps (pedagogical, not numeric). */
export const STEP_ORDER: number[] = WEEKS.filter((w) => w.step).map((w) => w.step!);

/** Week in which a step is introduced. */
export function weekOfStep(stepId: number): number {
  return WEEKS.find((w) => w.step === stepId)?.week ?? 1;
}

/** Before the first suffix week, "drills" practise the sounds instead. */
export function grammarStarted(day: number): boolean {
  return position(day).week >= weekOfStep(STEP_ORDER[0]);
}

/** Steps introduced on or before a plan day (always at least step 1). */
export function stepsIntroducedBy(day: number): number[] {
  const { week } = position(day);
  const steps = WEEKS.filter((w) => w.step && w.week <= week).map((w) => w.step!);
  return steps.length ? steps : [STEP_ORDER[0]];
}

// ── Positions ────────────────────────────────────────────────────────────
export function position(day: number): { week: number; index: number } {
  const d = Math.max(1, Math.min(PLAN_DAYS, Math.floor(day)));
  if (d === PLAN_DAYS) return { week: PLAN_WEEKS, index: 7 };
  return { week: Math.floor((d - 1) / 7) + 1, index: (d - 1) % 7 };
}

export function firstDayOfWeek(week: number): number {
  return (Math.max(1, Math.min(PLAN_WEEKS, week)) - 1) * 7 + 1;
}

export function stageOfWeek(week: number): Stage {
  return STAGES.find((s) => week >= s.weeks[0] && week <= s.weeks[1]) ?? STAGES[STAGES.length - 1];
}

export function firstDayOfStage(stageId: number): number {
  const s = STAGES.find((x) => x.id === stageId) ?? STAGES[0];
  return firstDayOfWeek(s.weeks[0]);
}

export function getWeek(week: number): PlanWeek {
  return WEEKS[Math.max(1, Math.min(PLAN_WEEKS, week)) - 1];
}

function concept(id: string, week: PlanWeek): PlanConcept | undefined {
  if (id === "step" && week.step) {
    const s = getStep(week.step);
    return {
      id: `step-${s.id}`,
      title: s.title,
      titleTr: s.titleTr,
      body: s.explanation,
      examples: s.examples,
      stepId: s.id,
      link: { href: `/gym?step=${s.id}`, label: "Practise it in Suffixes" },
    };
  }
  const c = CONCEPTS[id];
  if (!c) return undefined;
  return { id, title: c.title, titleTr: c.titleTr, body: c.body, examples: c.examples.map(([tr, en]) => ({ tr, en })), link: CONCEPT_LINKS[id] };
}

const WRITE_CHALLENGES = [
  "When your text comes back corrected, read the corrected version aloud twice.",
  "Use at least two of this week's new words in your text.",
  "Write one sentence more than you think you can.",
  "Start every sentence differently: no two with the same first word.",
];

function tier(stage: Stage): number {
  return stage.id <= 2 ? 0 : stage.id <= 4 ? 1 : 2;
}

/** Build one plan day (1–365). */
export function planDay(dayIn: number): PlanDay {
  const day = Math.max(1, Math.min(PLAN_DAYS, Math.floor(dayIn)));
  const { week, index } = position(day);
  const w = getWeek(week);
  const stage = stageOfWeek(week);
  const introduced = stepsIntroducedBy(day);
  const newStep = w.step;
  // Drill the new step in a week that has one; otherwise rotate through earlier steps.
  const step = newStep ?? introduced[week % introduced.length];
  const from = DAY_WORD_START[day - 1];
  const to = DAY_WORD_START[day];
  const words = { from, to };
  const nWords = to - from;

  const reviews: PlanTask = {
    key: "reviews",
    title: nWords ? `Reviews and ${nWords} new words` : "Reviews",
    detail: nWords ? "New words come from this week's topics" : "Keep what you know fresh",
    href: "/review",
    minutes: nWords ? 6 + Math.ceil(nWords / 2) : 5,
  };
  const lesson = (detail: string, optional = false): PlanTask => ({ key: "lesson", title: "Today's lesson", detail, href: "/lesson", minutes: 15, optional });
  const drills = (title: string, s: number): PlanTask =>
    grammarStarted(day)
      ? { key: "drills", title, detail: getStep(s).title, href: `/gym?step=${s}`, minutes: 5 }
      : { key: "drills", title: "Listen and spell 10 words", detail: "On the Alphabet page, at the bottom", href: "/alphabet", minutes: 5, manual: true };

  if (day === PLAN_DAYS) {
    return {
      day, week, index: 7, kind: "graduation", stage, weekInfo: w,
      title: "Graduation", titleTr: "Mezuniyet",
      concept: concept("review-map", w),
      step, words, challenge: "Have a 15-minute conversation in Turkish, then tell someone what you achieved this year. Tebrikler!",
      tasks: [
        { key: "learn", title: "Look back at the whole year", minutes: 3 },
        reviews,
        { key: "selfcheck", title: "Final check: can you hold a real conversation?", minutes: 2 },
        { key: "challenge", title: "Final challenge", minutes: 15 },
      ],
      minutes: 25,
    };
  }

  const kind = DAY_KINDS[index];
  const label = DAY_KIND_LABEL[kind];
  let title = label.en;
  let titleTr = label.tr;
  let c: PlanConcept | undefined;
  let challenge = "";
  let tasks: PlanTask[] = [];

  switch (kind) {
    case "learn":
      c = concept(w.concepts[0], w);
      title = c?.title ?? w.title;
      titleTr = c?.titleTr ?? w.titleTr;
      challenge = w.say;
      tasks = [{ key: "learn", title: `Learn: ${title}`, minutes: 3 }, reviews, lesson("Warm-up, dialogue, phrases, grammar and writing")];
      break;
    case "drill":
      title = !grammarStarted(day) ? "Practise the sounds" : newStep ? `Practise ${getStep(step).title}` : `Revisit ${getStep(step).title}`;
      titleTr = !grammarStarted(day) ? "Sesler" : "Alıştırma";
      challenge = DRILL_CHALLENGES[week % DRILL_CHALLENGES.length];
      tasks = [drills(newStep ? "10 suffix drills" : "10 review drills", step), reviews, lesson("Today's grammar spot is the same step")];
      break;
    case "listen":
      title = "Listen and repeat";
      titleTr = "Dinle ve tekrar et";
      challenge = LISTEN_CHALLENGES[tier(stage)][week % 3];
      tasks = [reviews, lesson("Play each dialogue line, then say it yourself")];
      break;
    case "learn2":
      c = concept(w.concepts[1], w);
      title = c?.title ?? w.title;
      titleTr = c?.titleTr ?? w.titleTr;
      challenge = w.extra;
      tasks = [{ key: "learn", title: `Learn: ${title}`, minutes: 3 }, reviews, lesson("Look for today's idea in the dialogue")];
      break;
    case "write":
      title = `Write: ${w.title.toLowerCase()}`;
      titleTr = "Yazma günü";
      challenge = WRITE_CHALLENGES[week % WRITE_CHALLENGES.length];
      tasks = [
        { key: "write", title: "Write a short text", detail: w.write, href: `/write?topic=${encodeURIComponent(w.write)}`, minutes: 8 },
        reviews,
        lesson("Optional today", true),
      ];
      break;
    case "out":
      title = "Out in the world";
      titleTr = "Dışarıda Türkçe";
      challenge = w.out;
      tasks = [reviews, { key: "mission", title: "This week's mission", detail: "Use the phrase sheet before you go", href: "/missions", minutes: 5 }, lesson("Optional today", true)];
      break;
    case "checkin":
      title = `Week ${week} check-in`;
      titleTr = "Haftalık değerlendirme";
      challenge = CHECKIN_CHALLENGES[week % CHECKIN_CHALLENGES.length];
      tasks = [
        reviews,
        drills(newStep ? "10 drills on this week's suffix" : "10 review drills", step),
        { key: "selfcheck", title: "Can you do this week's goal?", detail: w.goal, minutes: 1 },
      ];
      break;
  }
  tasks.push({ key: "challenge", title: "Tiny challenge", detail: challenge, minutes: 3 });
  const minutes = tasks.filter((t) => !t.optional).reduce((a, t) => a + t.minutes, 0);
  return { day, week, index, kind, stage, weekInfo: w, title, titleTr, concept: c, step, newStep, words, challenge, tasks, minutes };
}

/** Where to start the plan from, by what the learner already knows. */
export const START_POINTS = [
  { id: "zero", title: "Complete beginner", detail: "I don't know any Turkish yet.", day: 1 },
  { id: "basics", title: "A few words", detail: "I can read Turkish and say hello, please and thank you.", day: firstDayOfWeek(3) },
  { id: "survival", title: "Survival Turkish", detail: "I can order, count and say where I'm from.", day: firstDayOfStage(3) },
  { id: "a2", title: "Getting by", detail: "I can talk about my day in present, past and future.", day: firstDayOfStage(4) },
] as const;

export type StartPointId = (typeof START_POINTS)[number]["id"];
