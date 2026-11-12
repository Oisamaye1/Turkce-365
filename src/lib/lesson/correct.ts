import { knownWords } from "@/lib/db/cards";
import { currentGrammarStep } from "@/lib/db/grammar";
import { getSettings } from "@/lib/db/settings";
import { applyCorrection, getWriting, markWritingAttempt } from "@/lib/db/writing";
import { getStep } from "@/lib/grammar/steps";
import { claudeEnabled, runClaudeJson } from "@/lib/claude/cli";
import { buildCorrectionPrompt, learnerLevel } from "./prompt";
import { CORRECTION_JSON_SCHEMA, CorrectionSchema, type Correction } from "./schema";

export interface CorrectionOutcome {
  writingId: number;
  correction: Correction | null;
  cardsAdded: number;
  /** Claude isn't available here (e.g. the online app): the worker on your computer will correct it. */
  queued?: boolean;
  error?: string;
}

/** Correct a stored writing with `claude -p`; every error becomes a review card due today. */
export async function correctWriting(writingId: number): Promise<CorrectionOutcome> {
  const w = await getWriting(writingId);
  if (!w) return { writingId, correction: null, cardsAdded: 0, error: "Writing not found." };
  if (w.corrected) return { writingId, correction: w.corrected, cardsAdded: 0 };
  if (!claudeEnabled()) return { writingId, correction: null, cardsAdded: 0, queued: true };
  const step = getStep(await currentGrammarStep());
  const level = learnerLevel((await knownWords(3000)).length, step.id);
  const res = await runClaudeJson(buildCorrectionPrompt(w.prompt, w.myText, level, step.title), CorrectionSchema, {
    jsonSchema: CORRECTION_JSON_SCHEMA,
    timeoutMs: 180_000,
    model: (await getSettings()).claudeModel,
  });
  if (!res.ok) {
    await markWritingAttempt(writingId, res.error);
    return { writingId, correction: null, cardsAdded: 0, error: `Correction is unavailable right now (${res.error}). Your text is saved — retry later.` };
  }
  const cards = await applyCorrection(writingId, w.date, res.data);
  return { writingId, correction: res.data, cardsAdded: cards.length };
}
