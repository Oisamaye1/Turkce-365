import { z } from "zod";

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const DialogueLineSchema = z.object({
  speaker: z.string().min(1).max(40),
  tr: z.string().min(1).max(300),
  en: z.string().min(1).max(300),
});

export const GlossSchema = z.object({
  word: z.string().min(1).max(60),
  meaning: z.string().min(1).max(120),
  /** Morpheme breakdown, e.g. ["ev", "ler", "im", "den"]. */
  breakdown: z.array(z.string().max(40)).max(8).default([]),
});

export const PhraseSchema = z.object({
  tr: z.string().min(1).max(120),
  en: z.string().min(1).max(160),
  exTr: z.string().max(240).optional(),
  exEn: z.string().max(240).optional(),
  note: z.string().max(200).optional(),
});

export const GrammarExampleSchema = z.object({
  tr: z.string().min(1).max(160),
  en: z.string().min(1).max(200),
  breakdown: z.string().max(160).optional(),
});

export const LeechHelpSchema = z.object({
  tr: z.string().min(1),
  en: z.string().min(1),
  mnemonic: z.string().min(1).max(400),
  examples: z.array(z.object({ tr: z.string().min(1), en: z.string().min(1) })).length(3),
});

/** What Claude must return for a daily lesson. */
export const LessonContentSchema = z.object({
  title: z.string().min(1).max(100),
  titleTr: z.string().min(1).max(100),
  dialogue: z.object({
    setting: z.string().min(1).max(200),
    settingTr: z.string().max(200).optional(),
    lines: z.array(DialogueLineSchema).min(6).max(10),
    glossary: z.array(GlossSchema).max(60).default([]),
  }),
  newPhrases: z.array(PhraseSchema).length(5),
  grammar: z.object({
    title: z.string().min(1).max(100),
    explanation: z
      .string()
      .min(20)
      .refine((s) => words(s) <= 120, "explanation must be at most 120 words"),
    examples: z.array(GrammarExampleSchema).min(2).max(6),
  }),
  writing: z.object({
    prompt: z.string().min(10).max(400),
    promptTr: z.string().max(400).optional(),
    hints: z.array(z.string().max(160)).max(8).default([]),
  }),
  leeches: z.array(LeechHelpSchema).max(5).default([]),
});
export type LessonContent = z.infer<typeof LessonContentSchema>;

/** A daily lesson as stored in the `lessons` table (Claude content + local fields). */
export const DailyLessonSchema = LessonContentSchema.extend({
  kind: z.literal("daily"),
  date: z.string(),
  source: z.enum(["claude", "fallback"]),
  grammarStepId: z.number().int().min(1).max(16),
  warmupCardIds: z.array(z.number().int()),
  drillSeed: z.string(),
  missionNote: z.string().optional(),
});
export type DailyLesson = z.infer<typeof DailyLessonSchema>;

export const WeeklyQuizSchema = z.object({
  kind: z.literal("weekly"),
  date: z.string(),
  source: z.enum(["claude", "fallback"]),
  weekStart: z.string(),
  vocabCardIds: z.array(z.number().int()),
  drillSeed: z.string(),
  maxStep: z.number().int(),
  translation: z.object({ en: z.string(), tr: z.string() }),
  title: z.string(),
  titleTr: z.string(),
});
export type WeeklyQuiz = z.infer<typeof WeeklyQuizSchema>;

export type StoredLesson = DailyLesson | WeeklyQuiz;

/** JSON Schema for --json-schema (kept in sync with LessonContentSchema by tests). */
export const LESSON_JSON_SCHEMA = {
  type: "object",
  required: ["title", "titleTr", "dialogue", "newPhrases", "grammar", "writing", "leeches"],
  properties: {
    title: { type: "string" },
    titleTr: { type: "string" },
    dialogue: {
      type: "object",
      required: ["setting", "lines", "glossary"],
      properties: {
        setting: { type: "string" },
        settingTr: { type: "string" },
        lines: {
          type: "array",
          minItems: 6,
          maxItems: 10,
          items: {
            type: "object",
            required: ["speaker", "tr", "en"],
            properties: { speaker: { type: "string" }, tr: { type: "string" }, en: { type: "string" } },
          },
        },
        glossary: {
          type: "array",
          items: {
            type: "object",
            required: ["word", "meaning", "breakdown"],
            properties: { word: { type: "string" }, meaning: { type: "string" }, breakdown: { type: "array", items: { type: "string" } } },
          },
        },
      },
    },
    newPhrases: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        required: ["tr", "en"],
        properties: { tr: { type: "string" }, en: { type: "string" }, exTr: { type: "string" }, exEn: { type: "string" }, note: { type: "string" } },
      },
    },
    grammar: {
      type: "object",
      required: ["title", "explanation", "examples"],
      properties: {
        title: { type: "string" },
        explanation: { type: "string", description: "At most 120 words" },
        examples: {
          type: "array",
          minItems: 2,
          maxItems: 6,
          items: {
            type: "object",
            required: ["tr", "en"],
            properties: { tr: { type: "string" }, en: { type: "string" }, breakdown: { type: "string" } },
          },
        },
      },
    },
    writing: {
      type: "object",
      required: ["prompt", "hints"],
      properties: { prompt: { type: "string" }, promptTr: { type: "string" }, hints: { type: "array", items: { type: "string" } } },
    },
    leeches: {
      type: "array",
      items: {
        type: "object",
        required: ["tr", "en", "mnemonic", "examples"],
        properties: {
          tr: { type: "string" },
          en: { type: "string" },
          mnemonic: { type: "string" },
          examples: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "object", required: ["tr", "en"], properties: { tr: { type: "string" }, en: { type: "string" } } },
          },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------- writing correction

export const CorrectionSchema = z.object({
  corrected: z.string().min(1),
  errors: z
    .array(
      z.object({
        original: z.string().min(1),
        correction: z.string().min(1),
        rule: z.string().min(1).max(60),
        explanationEN: z.string().min(1).max(500),
      }),
    )
    .max(30),
  score: z.number().min(0).max(10),
  comment: z.string().min(1).max(400),
});
export type Correction = z.infer<typeof CorrectionSchema>;

export const CORRECTION_JSON_SCHEMA = {
  type: "object",
  required: ["corrected", "errors", "score", "comment"],
  properties: {
    corrected: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object",
        required: ["original", "correction", "rule", "explanationEN"],
        properties: {
          original: { type: "string" },
          correction: { type: "string" },
          rule: { type: "string" },
          explanationEN: { type: "string" },
        },
      },
    },
    score: { type: "number", minimum: 0, maximum: 10 },
    comment: { type: "string" },
  },
} as const;

// ---------------------------------------------------------------- weekly report narrative

export const ReportNarrativeSchema = z.object({
  focusAreas: z.array(z.string().min(1).max(200)).min(1).max(4),
  encouragement: z.string().min(1).max(300),
});
export type ReportNarrative = z.infer<typeof ReportNarrativeSchema>;

export const REPORT_JSON_SCHEMA = {
  type: "object",
  required: ["focusAreas", "encouragement"],
  properties: { focusAreas: { type: "array", items: { type: "string" } }, encouragement: { type: "string" } },
} as const;
