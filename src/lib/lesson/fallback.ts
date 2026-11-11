/**
 * Offline lesson builder: used when `claude -p` is unavailable or fails, so a day is never lost.
 * Uses a pre-written Northern Cyprus dialogue, the next unit's words and the local grammar notes.
 */
import dialoguesJson from "../../../data/dialogues.json";
import vocabJson from "../../../data/vocab.json";
import type { VocabEntry } from "@/lib/vocab/types";
import type { GrammarStep } from "@/lib/grammar/steps";
import type { LessonContent } from "./schema";

export interface PrewrittenDialogue {
  id: string;
  minStep: number;
  title: string;
  titleTr: string;
  setting: string;
  settingTr?: string;
  lines: { speaker: string; tr: string; en: string }[];
  glossary: { word: string; meaning: string; breakdown: string[] }[];
  phrases: { tr: string; en: string }[];
  writing: { prompt: string; promptTr?: string; hints: string[] };
}

export const DIALOGUES = dialoguesJson as PrewrittenDialogue[];

/** Pick the next dialogue suitable for the step, rotating so each is used before any repeats. */
export function pickDialogue(step: number, used: string[]): PrewrittenDialogue {
  const eligible = DIALOGUES.filter((d) => d.minStep <= step);
  const pool = eligible.length ? eligible : DIALOGUES;
  const counts = new Map(pool.map((d) => [d.id, used.filter((u) => u === d.id).length]));
  const min = Math.min(...counts.values());
  // Among the least-used dialogues, prefer the most advanced one the learner can handle.
  const candidates = pool.filter((d) => counts.get(d.id) === min).sort((a, b) => b.minStep - a.minStep);
  return candidates[0];
}

const SPECIAL = /[çğıİöşü]/;

function localMnemonic(tr: string, en: string): string {
  const special = [...new Set(tr.match(/[çğıİöşü]/g) ?? [])];
  const letters = special.length ? ` Watch the letters ${special.join(", ")} — say them aloud as you type.` : "";
  return `Picture yourself in Lefkoşa using "${tr}" to mean "${en}". Say it out loud three times, then write it once from memory.${letters}`;
}

function examplesFor(tr: string): { tr: string; en: string }[] {
  const vocab = vocabJson as VocabEntry[];
  const root = tr.split(" ")[0].replace(/m[ae]k$/, "").slice(0, Math.max(3, tr.length - 2)).toLocaleLowerCase("tr-TR");
  const hits = vocab
    .filter((v) => v.exTr && v.exEn && v.exTr.toLocaleLowerCase("tr-TR").includes(root))
    .map((v) => ({ tr: v.exTr!, en: v.exEn! }));
  const unique = [...new Map(hits.map((h) => [h.tr, h])).values()];
  return unique.slice(0, 3);
}

export interface FallbackInput {
  step: GrammarStep;
  usedDialogueIds: string[];
  /** Next unseen seed words (the "next unit's words"). */
  nextWords: { tr: string; en: string; exTr?: string | null; exEn?: string | null }[];
  /** Turkish forms already in the deck (to avoid re-adding the same dialogue phrases). */
  inDeck: Set<string>;
  leeches: { tr: string; en: string; exTr?: string | null; exEn?: string | null }[];
}

export function buildFallbackContent(input: FallbackInput): LessonContent & { dialogueId: string } {
  const d = pickDialogue(input.step.id, input.usedDialogueIds);
  type P = { tr: string; en: string; exTr?: string; exEn?: string };
  const fromDialogue: P[] = d.phrases.map((p) => ({ tr: p.tr, en: p.en }));
  const fromWords: P[] = input.nextWords.map((w) => ({ tr: w.tr, en: w.en, exTr: w.exTr ?? undefined, exEn: w.exEn ?? undefined }));
  const unseen = fromDialogue.filter((p) => !input.inDeck.has(p.tr));
  const newPhrases: P[] = (unseen.length >= 5 ? fromDialogue : [...unseen, ...fromWords]).slice(0, 5);
  while (newPhrases.length < 5) newPhrases.push(fromDialogue[newPhrases.length % fromDialogue.length]);

  return {
    dialogueId: d.id,
    title: d.title,
    titleTr: d.titleTr,
    dialogue: { setting: d.setting, settingTr: d.settingTr, lines: d.lines, glossary: d.glossary },
    newPhrases,
    grammar: {
      title: input.step.title,
      explanation: input.step.explanation,
      examples: input.step.examples,
    },
    writing: d.writing,
    leeches: input.leeches.slice(0, 3).map((l) => {
      const ex = examplesFor(l.tr);
      const own = l.exTr && l.exEn ? [{ tr: l.exTr, en: l.exEn }] : [];
      const examples = [...new Map([...own, ...ex].map((e) => [e.tr, e])).values()].slice(0, 3);
      while (examples.length < 3) examples.push({ tr: l.tr, en: l.en });
      return { tr: l.tr, en: l.en, mnemonic: localMnemonic(l.tr, l.en), examples };
    }),
  };
}

export { SPECIAL };
