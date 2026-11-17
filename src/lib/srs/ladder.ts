/**
 * The review ladder: how a card is tested, from easiest to hardest.
 *
 *   1 choose-meaning   see (and hear) the Turkish, pick the English meaning
 *   2 choose-turkish   see the English, pick the Turkish
 *   3 build            put the Turkish together from word tiles (phrases and sentences)
 *   4 type-hint        type the Turkish with the first letters and length shown
 *   5 type             type the Turkish from memory
 *
 * A card climbs one rung each time it's answered well (its SM-2 repetitions) and drops back
 * to the bottom after a miss. The learner's stage sets the pace: beginners climb slowly and
 * long phrases stay on tiles longer; later stages start higher and reach typing sooner.
 * Pure: shared by the server (tests) and the review screens.
 */
export type Exercise = "choose-meaning" | "choose-turkish" | "build" | "type-hint" | "type";

export const LADDER: Exercise[] = ["choose-meaning", "choose-turkish", "build", "type-hint", "type"];

export const EXERCISE_LABEL: Record<Exercise, string> = {
  "choose-meaning": "Recognise it",
  "choose-turkish": "Pick the Turkish",
  build: "Build it",
  "type-hint": "Type it with a hint",
  type: "Type it from memory",
};

export interface LadderInput {
  direction: "en-tr" | "tr-en";
  /** Successful reviews in a row (SM-2 repetitions); 0 for new or just-missed cards. */
  repetitions: number;
  /** First test right after the word was introduced. */
  isNew?: boolean;
  /** Plan stage 1–6 (1 = Foundations). */
  stage: number;
  /** The Turkish answer. */
  tr: string;
  pos?: string;
}

/** Words in the (first accepted form of the) Turkish answer. */
export function wordCount(tr: string): number {
  const first = tr.split(/\s*[/;|]\s*/)[0].replace(/\(.*?\)/g, " ");
  return first.trim().split(/\s+/).filter(Boolean).length;
}

export function exerciseFor(i: LadderInput): Exercise {
  const words = wordCount(i.tr);
  const stage = Math.max(1, Math.min(6, Math.round(i.stage)));

  // Corrections from your own writing: rebuild the corrected words, then type them.
  if (i.pos === "correction") {
    if (stage >= 4 && i.repetitions >= 1) return "type";
    if (i.repetitions >= 2) return "type-hint";
    return words >= 2 ? "build" : "type-hint";
  }

  // Turkish → English cards: recognising the meaning. Typing English only later on.
  if (i.direction === "tr-en") return stage >= 3 && i.repetitions >= 2 ? "type" : "choose-meaning";

  // Brand-new word: an easy first win.
  if (i.isNew) return stage >= 4 ? "choose-turkish" : "choose-meaning";

  // Later stages start higher on the ladder.
  const rung = i.repetitions + (stage >= 3 ? 1 : 0) + (stage >= 5 ? 1 : 0);
  const steps: Exercise[] =
    words <= 1
      ? ["choose-meaning", "choose-turkish", "type-hint", "type"]
      : words === 2
        ? ["choose-meaning", "choose-turkish", "build", "type-hint", "type"]
        : stage <= 2
          ? // Long phrases for beginners: more time on tiles, and typing only with a hint.
            ["choose-meaning", "choose-turkish", "build", "build", "type-hint", stage <= 1 ? "type-hint" : "type"]
          : ["choose-meaning", "choose-turkish", "build", "type-hint", "type"];
  return steps[Math.min(Math.max(0, rung), steps.length - 1)];
}

/** Exercises that are graded automatically (no Again/Hard/Good/Easy choice). */
export function autoGraded(e: Exercise): boolean {
  return e !== "type";
}

/** "t _ _ _ _ _ _ _   e _ _ _ _ _" — first letter of each word, the rest as blanks. */
export function letterHint(tr: string): string {
  const first = tr.split(/\s*[/;|]\s*/)[0].replace(/\(.*?\)/g, " ").trim();
  return first
    .split(/\s+/)
    .map((w) => [...w].map((ch, k) => (k === 0 || /[^\p{L}]/u.test(ch) ? ch : "_")).join(" "))
    .join("   ");
}
