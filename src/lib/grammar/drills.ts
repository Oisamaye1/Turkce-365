/**
 * Suffix drill generator: picks words from the vocabulary and asks the suffix
 * engine for the correct form. Every answer is engine-generated, so drills are
 * exactly as correct as the (unit-tested) engine.
 */
import {
  conjugate,
  copula,
  inflectNoun,
  possessiveCompound,
  questionParticle,
  type Case,
  type NounEntry,
  type Person,
  type RuleTag,
  type Tense,
  type VerbEntry,
} from "@/lib/turkish";
import type { VocabEntry } from "@/lib/vocab/types";
import { POSSESSIVE_EN, SUBJECT_EN, cap, englishVerbPhrase, firstGloss, pluralize } from "./english";
import { getStep } from "./steps";

export interface Drill {
  id: string;
  stepId: number;
  /** The word the learner starts from, e.g. "ev" or "gel-". */
  root: string;
  rootEn: string;
  /** Structured target, e.g. ["plural", "my", "from"]. */
  tags: string[];
  /** English meaning of the target form, e.g. "from my houses". */
  prompt: string;
  answer: string;
  alternatives: string[];
  breakdown: string[];
  rules: RuleTag[];
  ruleTag: string;
}

// ---------------------------------------------------------------- randomness

export type Rng = () => number;

/** Deterministic PRNG so a day's lesson drills are reproducible. */
export function seededRng(seed: number | string): Rng {
  let a = typeof seed === "number" ? seed : [...seed].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1779033703);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const chance = (rng: Rng, p: number) => rng() < p;

// ---------------------------------------------------------------- lexicon

export interface DrillLexicon {
  nouns: VocabEntry[];
  verbs: VocabEntry[];
  adjectives: VocabEntry[];
  people: VocabEntry[];
  places: VocabEntry[];
}

const PLACES = new Set([
  "ev", "okul", "üniversite", "hastane", "eczane", "market", "banka", "postane", "restoran", "otel",
  "ofis", "kafe", "park", "plaj", "kütüphane", "mutfak", "bahçe", "oda", "sınıf", "toplantı", "iş",
  "otobüs", "taksi", "araba", "çarşı", "müze", "köy", "şehir", "liman", "salon", "balkon", "banyo",
]);

const PEOPLE = new Set([
  "öğrenci", "öğretmen", "doktor", "komşu", "arkadaş", "çocuk", "anne", "baba", "kardeş", "müdür",
  "garson", "mühendis", "hemşire", "avukat", "turist", "misafir", "patron", "abla", "kuzen", "kız",
]);

export function nounEntry(v: VocabEntry): NounEntry {
  return {
    word: v.tr,
    softens: v.softens,
    harmonyOverride: v.harmonyOverride,
    dropsVowel: v.dropsVowel,
    doubles: v.doubles,
    yBuffer: v.yBuffer,
    proper: v.pos === "proper",
  };
}

export function verbEntry(v: VocabEntry): VerbEntry {
  return { infinitive: v.tr, stem: v.stem, aorist: v.aorist ?? "", softens: !!v.irregular };
}

const simple = (v: VocabEntry) => !v.tr.includes(" ") && !v.tr.includes("/") && !v.compound && !v.noDrill;

/**
 * Build the drill lexicon. When `known` is given (Turkish words the learner has
 * already met) and big enough, drills prefer those words.
 */
export function buildLexicon(vocab: VocabEntry[], known?: Set<string>, maxUnit = 30): DrillLexicon {
  const pool = (pred: (v: VocabEntry) => boolean, min: number) => {
    const all = vocab.filter(pred);
    const fromKnown = known ? all.filter((v) => known.has(v.tr)) : [];
    if (fromKnown.length >= min) return fromKnown;
    const early = all.filter((v) => v.unit <= maxUnit);
    return early.length >= min ? early : all;
  };
  return {
    nouns: pool((v) => v.pos === "noun" && simple(v), 12),
    verbs: pool((v) => v.pos === "verb" && simple(v) && !!v.aorist, 8),
    adjectives: pool((v) => v.pos === "adj" && simple(v), 8),
    people: vocab.filter((v) => v.pos === "noun" && PEOPLE.has(v.tr)),
    places: vocab.filter((v) => v.pos === "noun" && PLACES.has(v.tr)),
  };
}

// ---------------------------------------------------------------- English for cases

const CASE_EN: Record<Exclude<Case, "nom" | "ins">, (np: string) => string> = {
  loc: (np) => `in/at ${np}`,
  abl: (np) => `from ${np}`,
  dat: (np) => `to ${np}`,
  acc: (np) => `${np} (as object)`,
  gen: (np) => `of ${np}`,
};
const CASE_TAG: Record<Exclude<Case, "nom" | "ins">, string> = {
  loc: "in/at (locative)",
  abl: "from (ablative)",
  dat: "to (dative)",
  acc: "object (accusative)",
  gen: "of (genitive)",
};

const PERSONS: Person[] = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"];
const PERSONS_NO_3PL: Person[] = ["1sg", "2sg", "3sg", "1pl", "2pl"];

function nounPhrase(v: VocabEntry, plural: boolean, person?: Person): string {
  const g = firstGloss(v.en);
  const n = plural ? pluralize(g) : g;
  return person ? `${POSSESSIVE_EN[person]} ${n}` : `the ${n}`;
}

function predicateEn(v: VocabEntry, person: Person): string {
  const g = firstGloss(v.en);
  if (v.pos === "adj") return g;
  const plural = person === "1pl" || person === "2pl" || person === "3pl";
  return plural ? pluralize(g) : withArticle(g);
}

export function withArticle(g: string): string {
  return /^[aeiou]/i.test(g) ? `an ${g}` : `a ${g}`;
}

const BE: Record<Person, string> = { "1sg": "am", "2sg": "are", "3sg": "is", "1pl": "are", "2pl": "are", "3pl": "are" };
const BE_PAST: Record<Person, string> = { "1sg": "was", "2sg": "were", "3sg": "was", "1pl": "were", "2pl": "were", "3pl": "were" };

// ---------------------------------------------------------------- generators

type Gen = (rng: Rng, lex: DrillLexicon) => Omit<Drill, "id" | "stepId" | "ruleTag"> | null;

function caseDrill(c: Exclude<Case, "nom" | "ins">): Gen {
  return (rng, lex) => {
    const v = pick(rng, lex.nouns);
    const r = inflectNoun(nounEntry(v), { case: c });
    return {
      root: v.tr,
      rootEn: firstGloss(v.en),
      tags: [CASE_TAG[c]],
      prompt: CASE_EN[c](nounPhrase(v, false)),
      answer: r.form,
      alternatives: [],
      breakdown: r.parts,
      rules: r.rules,
    };
  };
}

const pluralGen: Gen = (rng, lex) => {
  const v = pick(rng, lex.nouns);
  const r = inflectNoun(nounEntry(v), { plural: true });
  return {
    root: v.tr,
    rootEn: firstGloss(v.en),
    tags: ["plural"],
    prompt: pluralize(firstGloss(v.en)),
    answer: r.form,
    alternatives: [],
    breakdown: r.parts,
    rules: r.rules,
  };
};

const possessiveGen: Gen = (rng, lex) => {
  const v = pick(rng, lex.nouns);
  const p = pick(rng, PERSONS);
  const r = inflectNoun(nounEntry(v), { possessive: p });
  return {
    root: v.tr,
    rootEn: firstGloss(v.en),
    tags: [POSSESSIVE_EN[p]],
    prompt: nounPhrase(v, false, p),
    answer: r.form,
    alternatives: [],
    breakdown: r.parts,
    rules: r.rules,
  };
};

const NAMES = ["Ali", "Ayşe", "Mehmet", "Elif", "Can", "Zeynep", "Emre"];

const genitiveGen: Gen = (rng, lex) => {
  const owned = pick(rng, lex.nouns);
  if (chance(rng, 0.3)) {
    const r = inflectNoun(nounEntry(owned), { case: "gen" });
    return {
      root: owned.tr,
      rootEn: firstGloss(owned.en),
      tags: [CASE_TAG.gen],
      prompt: `of the ${firstGloss(owned.en)}`,
      answer: r.form,
      alternatives: [],
      breakdown: r.parts,
      rules: r.rules,
    };
  }
  const useName = chance(rng, 0.5) || lex.people.length === 0;
  const ownerEntry: NounEntry = useName ? { word: pick(rng, NAMES), proper: true } : nounEntry(pick(rng, lex.people));
  const ownerEn = useName ? ownerEntry.word : `the ${firstGloss(lex.people.find((p) => p.tr === ownerEntry.word)!.en)}`;
  if (ownerEntry.word === owned.tr) return null;
  const r = possessiveCompound(ownerEntry, nounEntry(owned));
  return {
    root: `${ownerEntry.word} + ${owned.tr}`,
    rootEn: `${ownerEn} + ${firstGloss(owned.en)}`,
    tags: ["genitive + possessive"],
    prompt: `${ownerEn}'s ${firstGloss(owned.en)}`,
    answer: r.form,
    alternatives: [],
    breakdown: r.parts,
    rules: r.rules,
  };
};

const copulaGen: Gen = (rng, lex) => {
  const p = pick(rng, PERSONS);
  const negative = chance(rng, 0.25);
  const kind = rng();
  let base: VocabEntry;
  let entry: NounEntry;
  let en: string;
  let rootLabel: string;
  if (kind < 0.4 && lex.adjectives.length) {
    base = pick(rng, lex.adjectives);
    entry = nounEntry(base);
    en = firstGloss(base.en);
    rootLabel = base.tr;
  } else if (kind < 0.7 && lex.people.length) {
    base = pick(rng, lex.people);
    entry = nounEntry(base);
    en = predicateEn(base, p);
    rootLabel = base.tr;
  } else {
    base = pick(rng, lex.places.length ? lex.places : lex.nouns);
    const loc = inflectNoun(nounEntry(base), { case: "loc" });
    entry = { word: loc.form };
    en = `in/at the ${firstGloss(base.en)}`;
    rootLabel = `${base.tr} (→ ${loc.form})`;
  }
  const r = copula(entry, p, { negative });
  // "Onlar öğrenci." — the plural ending is optional with a 3rd-person plural subject.
  const alts = !negative && p === "3pl" ? [entry.word] : [];
  return {
    root: rootLabel,
    rootEn: firstGloss(base.en),
    tags: [SUBJECT_EN[p], negative ? "negative (değil)" : "to be"],
    prompt: cap(`${SUBJECT_EN[p]} ${BE[p]}${negative ? " not" : ""} ${en}`),
    answer: r.form,
    alternatives: alts,
    breakdown: r.parts,
    rules: r.rules,
  };
};

const varYokGen: Gen = (rng, lex) => {
  const v = pick(rng, lex.nouns);
  const g = firstGloss(v.en);
  const kind = Math.floor(rng() * 5);
  if (kind === 0) {
    return { root: v.tr, rootEn: g, tags: ["var", "question"], prompt: `Is there (any) ${g}?`, answer: `${v.tr} var mı`, alternatives: [], breakdown: [v.tr, "var", "mı"], rules: ["vowel-harmony-4"] };
  }
  if (kind === 1) {
    return { root: v.tr, rootEn: g, tags: ["yok"], prompt: `There is no ${g}.`, answer: `${v.tr} yok`, alternatives: [], breakdown: [v.tr, "yok"], rules: [] };
  }
  if (kind === 2) {
    const r = inflectNoun(nounEntry(v), { possessive: "1sg" });
    return { root: v.tr, rootEn: g, tags: ["my", "var"], prompt: `I have ${withArticle(g)}.`, answer: `${r.form} var`, alternatives: [], breakdown: [...r.parts, "var"], rules: r.rules };
  }
  if (kind === 3) {
    const q = questionParticle(v.tr, v.harmonyOverride);
    return { root: v.tr, rootEn: g, tags: ["question particle"], prompt: `Is it ${withArticle(g)}?`, answer: `${v.tr} ${q}`, alternatives: [], breakdown: [v.tr, q], rules: ["vowel-harmony-4"] };
  }
  const adj = lex.adjectives.length ? pick(rng, lex.adjectives) : v;
  const p = pick(rng, PERSONS);
  const r = copula(nounEntry(adj), p, { question: true });
  const en = adj.pos === "adj" ? firstGloss(adj.en) : predicateEn(adj, p);
  return {
    root: adj.tr,
    rootEn: firstGloss(adj.en),
    tags: [SUBJECT_EN[p], "question"],
    prompt: `${cap(BE[p])} ${SUBJECT_EN[p]} ${en}?`,
    answer: r.form,
    alternatives: p === "3pl" ? [`${adj.tr} ${questionParticle(adj.tr, adj.harmonyOverride)}`] : [],
    breakdown: r.parts,
    rules: r.rules,
  };
};

function verbGen(tense: Tense, opts: { neg: number; q: number }): Gen {
  return (rng, lex) => {
    const v = pick(rng, lex.verbs);
    const p = pick(rng, PERSONS);
    const negative = chance(rng, opts.neg);
    const question = chance(rng, opts.q);
    const r = conjugate(verbEntry(v), tense, p, { negative, question });
    const tags = [SUBJECT_EN[p], TENSE_LABEL[tense]];
    if (negative) tags.push("negative");
    if (question) tags.push("question");
    return {
      root: `${v.stem}-`,
      rootEn: firstGloss(v.en),
      tags,
      prompt: englishVerbPhrase(v.en, tense, p, { negative, question }),
      answer: r.form,
      alternatives: [],
      breakdown: r.parts,
      rules: r.rules,
    };
  };
}

export const TENSE_LABEL: Record<Tense, string> = {
  present: "present continuous",
  past: "past",
  future: "future",
  aorist: "aorist (habitual)",
  ability: "can (ability)",
};

const stackingGen: Gen = (rng, lex) => {
  const v = pick(rng, lex.nouns);
  const plural = chance(rng, 0.6);
  const p = pick(rng, PERSONS_NO_3PL);
  const c = pick(rng, ["loc", "abl", "dat", "acc", "gen"] as const);
  const r = inflectNoun(nounEntry(v), { plural, possessive: p, case: c });
  return {
    root: v.tr,
    rootEn: firstGloss(v.en),
    tags: [...(plural ? ["plural"] : []), POSSESSIVE_EN[p], CASE_TAG[c]],
    prompt: CASE_EN[c](nounPhrase(v, plural, p)),
    answer: r.form,
    alternatives: [],
    breakdown: r.parts,
    rules: r.rules,
  };
};

const GENERATORS: Record<number, Gen> = {
  1: pluralGen,
  2: caseDrill("loc"),
  3: caseDrill("abl"),
  4: caseDrill("dat"),
  5: caseDrill("acc"),
  6: possessiveGen,
  7: genitiveGen,
  8: copulaGen,
  9: varYokGen,
  10: verbGen("present", { neg: 0, q: 0.2 }),
  11: verbGen("present", { neg: 1, q: 0.15 }),
  12: verbGen("past", { neg: 0.2, q: 0.2 }),
  13: verbGen("future", { neg: 0.2, q: 0.2 }),
  14: verbGen("aorist", { neg: 0.25, q: 0.2 }),
  15: verbGen("ability", { neg: 0.25, q: 0.2 }),
  16: stackingGen,
};

/** Generate `count` distinct drills for a grammar step. */
export function generateDrills(stepId: number, count: number, lex: DrillLexicon, rng: Rng = Math.random): Drill[] {
  const gen = GENERATORS[stepId] ?? pluralGen;
  const step = getStep(stepId);
  const out: Drill[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < count * 25) {
    const d = gen(rng, lex);
    if (!d || seen.has(d.answer)) continue;
    seen.add(d.answer);
    out.push({ ...d, id: `${stepId}-${out.length}-${d.answer}`, stepId, ruleTag: step.tag });
  }
  return out;
}

/** Mixed drills across all unlocked steps (used by the weekly check-in). */
export function generateMixedDrills(maxStep: number, count: number, lex: DrillLexicon, rng: Rng = Math.random): Drill[] {
  const out: Drill[] = [];
  for (let i = 0; i < count; i++) {
    const step = 1 + Math.floor(rng() * Math.max(1, maxStep));
    const [d] = generateDrills(step, 1, lex, rng);
    if (d && !out.some((o) => o.answer === d.answer)) out.push({ ...d, id: `mix-${i}-${d.answer}` });
  }
  return out;
}

export { BE_PAST };
