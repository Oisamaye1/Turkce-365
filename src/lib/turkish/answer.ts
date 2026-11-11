/**
 * Turkish-aware answer checking for typed answers.
 *
 *  - "correct": matches after Turkish lower-casing (I→ı, İ→i) and punctuation cleanup.
 *  - "almost":  the only problem is missing Turkish letters (cok → çok), or a single
 *               typo in a word of ≥ 6 letters. Counts as a soft fail.
 *  - "wrong":   anything else.
 */
import { deasciify, levenshtein, normalizeAnswer, trLower } from "./text";

export type CheckResult = "correct" | "almost" | "wrong";

export interface CheckOutcome {
  result: CheckResult;
  /** The accepted answer closest to what was typed — show it to the learner. */
  expected: string;
  reason?: "missing-turkish-letters" | "typo" | "wrong";
}

/** Split a stored answer into accepted alternatives: "merhaba / selam" or "tamam; olur". */
export function alternatives(answer: string): string[] {
  return answer
    .split(/\s*[/;|]\s*/)
    .map((a) => a.replace(/\s*\(.*?\)\s*/g, " ").trim())
    .filter(Boolean);
}

function compareOne(given: string, expected: string, typoTolerance: boolean): CheckOutcome {
  const g = normalizeAnswer(given);
  const e = normalizeAnswer(expected);
  if (!g) return { result: "wrong", expected, reason: "wrong" };
  if (g === e) return { result: "correct", expected };
  // Apostrophes are optional in typing practice (Ali'nin vs Alinin) → almost.
  if (g.replace(/'/g, "") === e.replace(/'/g, "")) return { result: "almost", expected, reason: "typo" };

  const ga = deasciify(g);
  const ea = deasciify(e);
  if (ga === ea) return { result: "almost", expected, reason: "missing-turkish-letters" };

  const gw = g.split(" ");
  const ew = e.split(" ");
  if (gw.length === ew.length) {
    let missing = false;
    let typo = false;
    let hard = false;
    for (let i = 0; i < ew.length; i++) {
      const a = gw[i];
      const b = ew[i];
      if (a === b) continue;
      if (deasciify(a) === deasciify(b)) {
        missing = true;
        continue;
      }
      if (typoTolerance && b.length >= 6 && levenshtein(deasciify(a), deasciify(b)) <= 1) {
        typo = true;
        continue;
      }
      hard = true;
      break;
    }
    const soft = missing || typo;
    const reason: CheckOutcome["reason"] = typo ? "typo" : "missing-turkish-letters";
    if (!hard && soft) return { result: "almost", expected, reason };
  }
  // Whole-string single typo (e.g. a missing space: "teşekkürederim").
  if (typoTolerance && e.replace(/ /g, "").length >= 6 && levenshtein(g, e) <= 1) {
    return { result: "almost", expected, reason: "typo" };
  }
  return { result: "wrong", expected, reason: "wrong" };
}

const RANK: Record<CheckResult, number> = { correct: 2, almost: 1, wrong: 0 };

/** Check a typed Turkish answer against a stored answer (which may contain alternatives). */
export interface CheckOptions {
  /**
   * Allow one typo in words of ≥ 6 letters (default true). Suffix drills turn this off:
   * there "kitapda" for "kitapta" is a real grammar mistake, not a typo.
   */
  typoTolerance?: boolean;
}

export function checkTurkish(given: string, answer: string | string[], opts: CheckOptions = {}): CheckOutcome {
  const typoTolerance = opts.typoTolerance ?? true;
  const alts = (Array.isArray(answer) ? answer : [answer]).flatMap(alternatives);
  let best: CheckOutcome = { result: "wrong", expected: alts[0] ?? "", reason: "wrong" };
  for (const alt of alts) {
    const o = compareOne(given, alt, typoTolerance);
    if (RANK[o.result] > RANK[best.result]) best = o;
    if (best.result === "correct") break;
  }
  return best;
}

const EN_STOP = /^(to|a|an|the)\s+/;

function normalizeEnglish(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\(.*?\)/g, " ")
    .replace(/[.,!?;:"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(EN_STOP, "")
    .replace(EN_STOP, "");
}

/** Lenient English check for the Turkish → English direction. */
export function checkEnglish(given: string, answer: string): CheckOutcome {
  const alts = answer
    .split(/\s*[/;,]\s*/)
    .map(normalizeEnglish)
    .filter(Boolean);
  const g = normalizeEnglish(given);
  if (!g) return { result: "wrong", expected: answer, reason: "wrong" };
  for (const a of alts) if (a === g) return { result: "correct", expected: answer };
  if (normalizeEnglish(answer) === g) return { result: "correct", expected: answer };
  for (const a of alts) {
    if (a.length >= 5 && levenshtein(a, g) <= 1) return { result: "almost", expected: answer, reason: "typo" };
  }
  return { result: "wrong", expected: answer, reason: "wrong" };
}

export { trLower };
