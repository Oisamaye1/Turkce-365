/**
 * Noun & nominal morphology: plural, possessive, case, copula, question particle.
 * Pure functions — every output is covered by tests in tests/suffix-engine.test.ts.
 */
import {
  applyTemplate,
  endsWithVowel,
  harmonyI,
  isVowel,
  soften,
  type HarmonyOverride,
} from "./phonology";

export type Person = "1sg" | "2sg" | "3sg" | "1pl" | "2pl" | "3pl";
export const PERSONS: Person[] = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"];

export type Case = "nom" | "acc" | "dat" | "loc" | "abl" | "gen" | "ins";

/** Rule tags — also used to tag mistakes and per-rule accuracy. */
export type RuleTag =
  | "vowel-harmony-2"
  | "vowel-harmony-4"
  | "consonant-assimilation"
  | "consonant-softening"
  | "buffer-y"
  | "buffer-s"
  | "buffer-n"
  | "pronominal-n"
  | "vowel-drop"
  | "consonant-doubling"
  | "harmony-exception"
  | "irregular-stem"
  | "vowel-narrowing"
  | "proper-noun-apostrophe";

export interface NounEntry {
  word: string;
  /** Consonant softening (p→b, ç→c, t→d, k→ğ) before a vowel-initial suffix. Stored per word — never guessed. */
  softens?: boolean;
  /** Loanwords like "saat" take front-vowel suffixes despite a back last vowel. */
  harmonyOverride?: HarmonyOverride;
  /** Last-syllable vowel drops before a vowel suffix: şehir → şehri, burun → burnu. */
  dropsVowel?: boolean;
  /** Final consonant doubles before a vowel suffix: hak → hakkı, his → hissi. */
  doubles?: boolean;
  /** "su" and "ne" use y where other vowel-final nouns use s / n: suyu, suyun, suyum. */
  yBuffer?: boolean;
  /** Proper nouns keep the suffix after an apostrophe and do not soften in writing: Ali'nin, Mehmet'e. */
  proper?: boolean;
}

export interface NounFormSpec {
  plural?: boolean;
  possessive?: Person;
  case?: Case;
}

export interface Inflected {
  form: string;
  /** Morpheme breakdown, e.g. ["ev", "ler", "im", "den"]. The first part is the (possibly modified) root. */
  parts: string[];
  rules: RuleTag[];
}

export const toEntry = (n: NounEntry | string): NounEntry =>
  typeof n === "string" ? { word: n } : n;

function hasVowel(s: string) {
  return [...s].some(isVowel);
}

/** Root as it appears before a vowel-initial suffix. */
function vowelStem(entry: NounEntry, rules: RuleTag[]): string {
  let root = entry.word;
  if (entry.proper) return root;
  if (entry.dropsVowel) {
    // Drop the last vowel: şehir → şehr, ağız → ağz, kayıt → kayt
    for (let i = root.length - 1; i >= 0; i--) {
      if (isVowel(root[i])) {
        root = root.slice(0, i) + root.slice(i + 1);
        break;
      }
    }
    rules.push("vowel-drop");
  }
  if (entry.doubles) {
    root = root + root[root.length - 1];
    rules.push("consonant-doubling");
    return root;
  }
  if (entry.softens) {
    const softened = soften(root);
    if (softened !== root) {
      root = softened;
      rules.push("consonant-softening");
    }
  }
  return root;
}

const POSS_AFTER_CONSONANT: Record<Person, string> = {
  "1sg": "Im",
  "2sg": "In",
  "3sg": "I",
  "1pl": "ImIz",
  "2pl": "InIz",
  "3pl": "lArI",
};
const POSS_AFTER_VOWEL: Record<Person, string> = {
  "1sg": "m",
  "2sg": "n",
  "3sg": "sI",
  "1pl": "mIz",
  "2pl": "nIz",
  "3pl": "lArI",
};

const CASE_TEMPLATES: Record<Exclude<Case, "nom">, string> = {
  acc: "(y)I",
  dat: "(y)A",
  loc: "DA",
  abl: "DAn",
  gen: "(n)In",
  ins: "(y)lA",
};
/** After a 3rd-person possessive, case endings take a pronominal n: evinde, evine, evini. */
const CASE_AFTER_3POSS: Record<Exclude<Case, "nom">, string> = {
  acc: "nI",
  dat: "nA",
  loc: "ndA",
  abl: "ndAn",
  gen: "nIn",
  ins: "ylA",
};

const isVowelInitial = (tpl: string) => tpl[0] === "I" || tpl[0] === "A";

export function inflectNoun(input: NounEntry | string, spec: NounFormSpec = {}): Inflected {
  const entry = toEntry(input);
  const rules: RuleTag[] = [];
  const override = entry.harmonyOverride;
  if (override) rules.push("harmony-exception");
  const suffixes: string[] = [];
  let root = entry.word;
  let rootTouched = false; // root modified for a vowel-initial suffix?

  const current = () => root + suffixes.join("");
  const ov = () => (suffixes.some(hasVowel) ? undefined : override);

  const add = (tpl: string) => {
    const atRoot = suffixes.length === 0;
    if (atRoot && !rootTouched) {
      // After a consonant the buffer letter disappears: "(y)I" → "I" (vowel-initial), "(y)lA" → "lA" (not).
      const effective = tpl.replace(/^\((y|n|s)\)/, "");
      if (isVowelInitial(effective) && !endsWithVowel(root)) {
        root = vowelStem(entry, rules);
        rootTouched = true;
      }
    }
    // su / ne: y replaces the s / n buffer and is also inserted before possessive consonants.
    if (atRoot && entry.yBuffer && endsWithVowel(root)) {
      if (tpl === "sI" || tpl === "(n)In") tpl = "yI" + (tpl === "(n)In" ? "n" : "");
      else if (tpl === "m" || tpl === "n" || tpl === "mIz" || tpl === "nIz") tpl = "yI" + tpl;
      if (tpl.startsWith("yI")) rules.push("buffer-y");
    }
    const before = current();
    const sfx = applyTemplate(before, tpl, ov());
    if (tpl.startsWith("(y)") && endsWithVowel(before)) rules.push("buffer-y");
    if (tpl.startsWith("(n)") && endsWithVowel(before)) rules.push("buffer-n");
    if (tpl === "sI" && endsWithVowel(before)) rules.push("buffer-s");
    if (tpl.includes("D") && sfx.startsWith("t")) rules.push("consonant-assimilation");
    if (tpl.includes("A")) rules.push("vowel-harmony-2");
    if (tpl.includes("I")) rules.push("vowel-harmony-4");
    suffixes.push(sfx);
  };

  if (spec.plural) add("lAr");

  let third = false;
  if (spec.possessive) {
    const p = spec.possessive;
    if (spec.plural) {
      // evler + im / in / i / imiz / iniz / i  (3pl after plural is just -I: evleri)
      add(p === "3pl" ? "I" : POSS_AFTER_CONSONANT[p]);
    } else if (p === "3pl") {
      add("lArI");
    } else {
      add(endsWithVowel(root) ? POSS_AFTER_VOWEL[p] : POSS_AFTER_CONSONANT[p]);
    }
    third = p === "3sg" || p === "3pl";
  }

  if (spec.case && spec.case !== "nom") {
    if (third) {
      add(CASE_AFTER_3POSS[spec.case]);
      if (spec.case !== "ins") rules.push("pronominal-n");
    } else if (spec.case === "gen" && entry.yBuffer && suffixes.length === 0) {
      add("(n)In"); // handled by yBuffer branch → suyun
    } else {
      add(CASE_TEMPLATES[spec.case]);
    }
  }

  const parts = [root, ...suffixes];
  let form = root + suffixes.join("");
  if (entry.proper && suffixes.length) {
    form = root + "'" + suffixes.join("");
    rules.push("proper-noun-apostrophe");
  }
  return { form, parts, rules: dedupe(rules) };
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** Question particle mı/mi/mu/mü — written as a separate word, follows 4-way harmony. */
export function questionParticle(word: string, override?: HarmonyOverride): string {
  return "m" + harmonyI(word, override);
}

const COPULA_PRESENT: Record<Person, string> = {
  "1sg": "(y)Im",
  "2sg": "sIn",
  "3sg": "",
  "1pl": "(y)Iz",
  "2pl": "sInIz",
  "3pl": "lAr",
};
const COPULA_PAST_PERSON: Record<Person, string> = {
  "1sg": "m",
  "2sg": "n",
  "3sg": "",
  "1pl": "k",
  "2pl": "nIz",
  "3pl": "lAr",
};

export interface CopulaOptions {
  negative?: boolean;
  question?: boolean;
  past?: boolean;
}

/**
 * "To be" endings on a nominal predicate: öğrenciyim, yorgunsun, evdeyiz.
 * Pass a NounEntry (with softens) for nouns/adjectives so "çocuk" → "çocuğum".
 */
export function copula(predicate: NounEntry | string, person: Person, opts: CopulaOptions = {}): Inflected {
  const entry = toEntry(predicate);
  const override = entry.harmonyOverride;
  const rules: RuleTag[] = [];

  if (opts.negative) {
    // değil + endings, written as a separate word
    const neg = opts.past ? personalPast("değil", person, rules) : personalPresent({ word: "değil" }, person, rules);
    if (opts.question) {
      if (opts.past) {
        // değil miydin? (değil mi + ydi + n)
        const q = "mi" + applyTemplate("mi", "(y)DI" + COPULA_PAST_PERSON[person]);
        return { form: `${entry.word} değil ${q}`, parts: [entry.word, "değil", q], rules };
      }
      const base = person === "3pl" ? "değiller" : "değil";
      const q = person === "3pl" ? "mi" : "mi" + applyTemplate("mi", COPULA_PRESENT[person]);
      return { form: `${entry.word} ${base} ${q}`, parts: [entry.word, base, q], rules };
    }
    return { form: `${entry.word} ${neg.form}`, parts: [entry.word, ...neg.parts], rules };
  }

  if (opts.question) {
    if (opts.past) {
      // öğrenci miydim? yorgun muydun?
      const mi = questionParticle(entry.word, override);
      const rest = applyTemplate(mi, "(y)DI" + COPULA_PAST_PERSON[person]);
      rules.push("vowel-harmony-4", "buffer-y");
      return { form: `${entry.word} ${mi}${rest}`, parts: [entry.word, mi + rest], rules };
    }
    if (person === "3pl") {
      const pl = applyTemplate(entry.word, "lAr", override);
      const mi = questionParticle(pl);
      rules.push("vowel-harmony-2", "vowel-harmony-4");
      return { form: `${entry.word}${pl} ${mi}`, parts: [entry.word, pl, mi], rules };
    }
    const mi = questionParticle(entry.word, override);
    const end = applyTemplate(mi, COPULA_PRESENT[person]);
    if (person === "1sg" || person === "1pl") rules.push("buffer-y");
    rules.push("vowel-harmony-4");
    return { form: `${entry.word} ${mi}${end}`, parts: [entry.word, mi + end], rules };
  }

  if (opts.past) return personalPast(entry, person, rules);
  return personalPresent(entry, person, rules);
}

function personalPresent(entry: NounEntry, person: Person, rules: RuleTag[]): Inflected {
  const tpl = COPULA_PRESENT[person];
  if (!tpl) return { form: entry.word, parts: [entry.word], rules };
  let root = entry.word;
  if (tpl.startsWith("(y)") && !endsWithVowel(root)) root = vowelStem(entry, rules);
  const sfx = applyTemplate(root, tpl, entry.harmonyOverride);
  if (tpl.startsWith("(y)") && endsWithVowel(root)) rules.push("buffer-y");
  rules.push(tpl.includes("A") ? "vowel-harmony-2" : "vowel-harmony-4");
  return { form: root + sfx, parts: [root, sfx], rules: dedupe(rules) };
}

function personalPast(input: NounEntry | string, person: Person, rules: RuleTag[]): Inflected {
  const entry = toEntry(input);
  const root = entry.word;
  const di = applyTemplate(root, "(y)DI", entry.harmonyOverride);
  if (endsWithVowel(root)) rules.push("buffer-y");
  if (di.replace(/^y/, "").startsWith("t")) rules.push("consonant-assimilation");
  const pers = applyTemplate(root + di, COPULA_PAST_PERSON[person]);
  rules.push("vowel-harmony-4");
  const parts = pers ? [root, di, pers] : [root, di];
  return { form: root + di + pers, parts, rules: dedupe(rules) };
}

/** Genitive–possessive compound: (Ali, araba) → "Ali'nin arabası". */
export function possessiveCompound(owner: NounEntry | string, owned: NounEntry | string): Inflected {
  const gen = inflectNoun(owner, { case: "gen" });
  const poss = inflectNoun(owned, { possessive: "3sg" });
  return {
    form: `${gen.form} ${poss.form}`,
    parts: [...gen.parts, "·", ...poss.parts],
    rules: dedupe([...gen.rules, ...poss.rules]),
  };
}

/** Personal pronouns in the genitive (benim, senin…) — irregular, so listed. */
export const PRONOUN_GENITIVE: Record<Person, string> = {
  "1sg": "benim",
  "2sg": "senin",
  "3sg": "onun",
  "1pl": "bizim",
  "2pl": "sizin",
  "3pl": "onların",
};

export const PERSONAL_PRONOUN: Record<Person, string> = {
  "1sg": "ben",
  "2sg": "sen",
  "3sg": "o",
  "1pl": "biz",
  "2pl": "siz",
  "3pl": "onlar",
};
