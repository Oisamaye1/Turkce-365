/**
 * Prompt templates for `claude -p`. The lesson prompt follows the template in the
 * project spec, with the variables filled from the learner's progress.
 */
import type { GrammarStep } from "@/lib/grammar/steps";
import { LESSON_JSON_SCHEMA } from "./schema";

export interface LessonPromptContext {
  date: string;
  level: string;
  grammarStep: GrammarStep;
  knownWords: string[];
  mistakes: string[];
  leeches: { tr: string; en: string }[];
  missionStruggles: string[];
  recentTitles: string[];
}

export function learnerLevel(wordsKnown: number, step: number): string {
  if (wordsKnown < 100 && step <= 2) return "A0 (absolute beginner)";
  if (wordsKnown < 500 || step <= 6) return "A1 (beginner)";
  if (wordsKnown < 1100 || step <= 12) return "A2 (elementary)";
  return "B1 (intermediate)";
}

export function buildLessonPrompt(ctx: LessonPromptContext): string {
  const known = ctx.knownWords.length ? ctx.knownWords.join(", ") : "(none yet — the learner is just starting; use greetings and very simple words)";
  const mistakes = ctx.mistakes.length ? ctx.mistakes.join("; ") : "none recorded";
  const leeches = ctx.leeches.length ? ctx.leeches.map((l) => `${l.tr} (${l.en})`).join(", ") : "none";
  return `You are a Turkish tutor for an adult English-speaking beginner living in Northern Cyprus.
Learner level: ${ctx.level}. Current grammar step: ${ctx.grammarStep.id} — ${ctx.grammarStep.title}. Known words (sample): ${known}.
Recent mistakes: ${mistakes}. Leech words: ${leeches}.
Create today's lesson. Use ONLY known words plus exactly 5 new phrases.
Set the dialogue in a realistic Northern Cyprus situation.
Return ONLY valid JSON matching this schema: ${JSON.stringify(LESSON_JSON_SCHEMA)}
Turkish must be natural, correct, standard Istanbul Turkish. Double-check every suffix.

Details:
- Date: ${ctx.date}. Recent lesson titles (do not repeat the same situation): ${ctx.recentTitles.join(" | ") || "none"}.
- Mission struggles to recycle if relevant: ${ctx.missionStruggles.join(" | ") || "none"}.
- title: short English title; titleTr: the Turkish title.
- dialogue.setting: one English sentence describing the place (e.g. a café in Lefkoşa, the bus to Girne, the university, the market).
- dialogue.lines: 6–10 lines. Speaker "Sen" is the learner; the other speaker has a role name in Turkish (Garson, Satıcı, Şoför, Ayşe…). Each line has tr and en.
- dialogue.glossary: for every inflected or new word in the dialogue give { word (exactly as written), meaning (English), breakdown (morphemes, e.g. ["ev","ler","im","den"]) }.
- newPhrases: exactly 5 useful phrases taken from the dialogue, each with tr, en, and an extra example sentence exTr/exEn.
- grammar: spotlight the current grammar step (${ctx.grammarStep.title}). explanation: at most 120 words, plain English, mention the suffix pattern. examples: 3–4 examples from the dialogue context with a "breakdown" like "ev + ler + im + den".
- writing.prompt: a task asking for 3–5 Turkish sentences that practise today's grammar and vocabulary, with 2–4 short hints (sentence starters).
- leeches: for EACH leech word listed above give a memorable English mnemonic and exactly 3 fresh, simple example sentences (tr + en). If there are no leech words return [].
- Use Turkish letters correctly (ç ğ ı İ ö ş ü). Place names: Lefkoşa, Girne, Gazimağusa, Güzelyurt, İskele, Karpaz.`;
}

export function buildCorrectionPrompt(task: string, text: string, level: string, grammarTitle: string): string {
  return `You are a kind but precise Turkish teacher correcting a short text written by an adult English-speaking learner (level ${level}, currently studying: ${grammarTitle}) who lives in Northern Cyprus.

Writing task: ${task}

Learner's text:
"""
${text}
"""

Correct it to natural, standard Istanbul Turkish while keeping the learner's meaning and level (do not rewrite into advanced Turkish).
Return ONLY a JSON object:
{
  "corrected": "the full corrected text",
  "errors": [ { "original": "the wrong word or phrase as the learner wrote it", "correction": "the corrected word or phrase", "rule": "short rule name, e.g. past-tense, vowel-harmony, accusative, dative, locative, possessive, word-order, spelling, word-choice", "explanationEN": "one or two sentences in English explaining why" } ],
  "score": number from 0 to 10,
  "comment": "one short encouraging comment in English (you may add a Turkish word of praise)"
}
Rules:
- One entry per distinct error. For word-order or tense errors, the "original" and "correction" may be whole short sentences (e.g. "Ben okula gidiyorum dün" → "Dün okula gittim").
- Missing Turkish letters (cok → çok) count as spelling errors.
- If the text is already correct, return errors: [] and a high score.
- Double-check every suffix in "corrected".`;
}

export function buildReportPrompt(summary: string): string {
  return `You are a Turkish tutor writing a short weekly progress note for an adult beginner learning Turkish in Northern Cyprus (20–25 minutes a day).
Here is the learner's week as data:
${summary}

Return ONLY JSON: { "focusAreas": [2–3 concrete, actionable focus areas for next week, each one sentence in English], "encouragement": "one or two warm sentences in English, may include a Turkish phrase" }`;
}
