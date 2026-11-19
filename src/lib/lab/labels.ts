/**
 * Plain-English labels for each piece of a word built by the suffix engine, for the
 * Word Lab and the "How Turkish works" course. Pure and client-safe.
 */
import type { Case, Person } from "@/lib/turkish/nouns";
import type { Tense } from "@/lib/turkish/verbs";

export const RULE_TEXT: Record<string, string> = {
  "vowel-harmony-2": "Two-way harmony: the ending takes a after a, ı, o, u and e after e, i, ö, ü.",
  "vowel-harmony-4": "Four-way harmony: the ending takes ı, i, u or ü to match the last vowel.",
  "consonant-assimilation": "After f, s, t, k, ç, ş, h, p a d at the start of an ending becomes t.",
  "consonant-softening": "Before a vowel, a final p, ç, t, k softens to b, c, d, ğ.",
  "buffer-y": "Two vowels can't meet, so a y goes between them.",
  "buffer-s": "After a vowel, his/her takes an s: araba → arabası.",
  "buffer-n": "After a vowel, the genitive takes an n: araba → arabanın.",
  "pronominal-n": "After his/her/their, an n comes before the case ending: evinde.",
  "vowel-drop": "The last vowel drops before a vowel ending: şehir → şehri.",
  "consonant-doubling": "The final consonant doubles before a vowel: hak → hakkı.",
  "harmony-exception": "A loanword that takes front-vowel endings: saat → saatler.",
  "irregular-stem": "This verb's stem changes: git → gid-, et → ed-.",
  "vowel-narrowing": "The stem's last vowel changes before -yor or y: başla → başlıyor, ye → yiyor.",
  "proper-noun-apostrophe": "Names keep their endings after an apostrophe: Ali'nin.",
};

export const POSS_LABEL: Record<Person, string> = { "1sg": "my", "2sg": "your", "3sg": "his/her", "1pl": "our", "2pl": "your (pl.)", "3pl": "their" };
export const CASE_LABEL: Record<Exclude<Case, "nom">, string> = {
  acc: "the (object)",
  dat: "to",
  loc: "in / at",
  abl: "from",
  gen: "'s / of",
  ins: "with / by",
};
export const PERSON_LABEL: Record<Person, string> = { "1sg": "I", "2sg": "you", "3sg": "he/she", "1pl": "we", "2pl": "you (pl.)", "3pl": "they" };

export function nounLabels(gloss: string, spec: { plural?: boolean; possessive?: Person; case?: Case }, parts: string[]): string[] | undefined {
  const l = [gloss];
  if (spec.plural) l.push("plural");
  if (spec.possessive) l.push(POSS_LABEL[spec.possessive]);
  if (spec.case && spec.case !== "nom") l.push(CASE_LABEL[spec.case]);
  return l.length === parts.length ? l : undefined;
}

interface Opts {
  negative?: boolean;
  question?: boolean;
}

/** Labels for the endings after the verb root, following each tense's layout in the engine. */
function tail(tense: Tense, p: Person, o: Opts): string[] {
  const P = PERSON_LABEL[p];
  const person = p === "3sg" ? [] : [P];
  const q = (base: string[]) => [...base, ...(p === "3pl" ? ["they"] : []), `question + ${P}`];
  switch (tense) {
    case "present": {
      const core = [...(o.negative ? ["not"] : []), "-ing (now)"];
      return o.question ? q(core) : [...core, ...person];
    }
    case "past": {
      const core = [...(o.negative ? ["not"] : []), "past", ...person];
      return o.question ? [...core, "question"] : core;
    }
    case "future": {
      const core = [...(o.negative ? ["not"] : []), "will"];
      return o.question ? q(core) : [...core, ...person];
    }
    case "aorist":
      if (o.negative) return o.question ? q(["not (usually)"]) : ["not", p === "3sg" ? "(usually)" : `(usually) + ${P}`];
      return o.question ? q(["usually"]) : ["usually", ...person];
    case "ability":
      if (o.negative) return o.question ? q(["can", "not"]) : ["can", "not", p === "3sg" ? "(aorist)" : P];
      return o.question ? q(["can", "(aorist)"]) : ["can", "(aorist)", ...person];
    case "imperative":
      return [...(o.negative ? ["don't"] : []), ...(p === "2pl" ? ["(polite)"] : [])];
    case "want":
      return ["to", "want", ...tail("present", p, o)];
    case "necessity": {
      const core = [...(o.negative ? ["not"] : []), "must"];
      return o.question ? q(core) : [...core, ...person];
    }
    case "evidential": {
      const core = [...(o.negative ? ["not"] : []), "apparently"];
      return o.question ? q(core) : [...core, ...person];
    }
    case "conditional": {
      const core = o.negative ? ["not (aorist)"] : ["(aorist)"];
      return p === "3pl" ? [...core, "they", "if"] : [...core, "if", ...person];
    }
    case "pastcont":
      return [...(o.negative ? ["not"] : []), "-ing", ...(p === "3pl" ? ["they", "was"] : ["was", ...person])];
  }
}

export function verbLabels(gloss: string, tense: Tense, p: Person, o: Opts, parts: string[]): string[] | undefined {
  // "want" starts with the main verb, then istemek's own pieces.
  const l = tense === "want" ? [gloss, ...tail(tense, p, o).map((x, i) => (i === 1 ? "want" : x))] : [gloss, ...tail(tense, p, o)];
  return l.length === parts.length ? l : undefined;
}

export const TENSE_INFO: Record<Tense, { label: string; en: string }> = {
  present: { label: "Present", en: "doing now" },
  past: { label: "Past", en: "did" },
  future: { label: "Future", en: "will do" },
  aorist: { label: "Habit", en: "usually do" },
  ability: { label: "Can", en: "can do" },
  imperative: { label: "Command", en: "do it!" },
  want: { label: "Want to", en: "want to do" },
  necessity: { label: "Must", en: "must do" },
  evidential: { label: "Apparently", en: "apparently did" },
  conditional: { label: "If", en: "if … do" },
  pastcont: { label: "Was doing", en: "was doing" },
};
