/**
 * Verb morphology: present continuous, past, future, aorist, abilitative,
 * with negative and question forms. Pure functions.
 */
import { applyTemplate, endsWithVowel, harmonyA, harmonyI, lastChar, soften } from "./phonology";
import type { Inflected, Person, RuleTag } from "./nouns";
import { PERSONS } from "./nouns";

export interface VerbEntry {
  /** Dictionary form: "gelmek", "teşekkür etmek". */
  infinitive: string;
  /** Stem without -mAk; derived from the infinitive when omitted. */
  stem?: string;
  /** 3rd-person-singular aorist ("gelir", "gider", "yapar") — irregular, so stored per verb. */
  aorist: string;
  /** Stem-final t → d before a vowel: git → gidiyor, et → ediyor. Only a handful of verbs do this. */
  softens?: boolean;
}

export type Tense =
  | "present"
  | "past"
  | "future"
  | "aorist"
  | "ability"
  | "imperative"
  | "want"
  | "necessity"
  | "evidential"
  | "conditional"
  | "pastcont";
export const TENSES: Tense[] = ["present", "past", "future", "aorist", "ability", "imperative", "want", "necessity", "evidential", "conditional", "pastcont"];
/** Tenses that have a question form in the drills and the Word Lab. */
export const QUESTION_TENSES: Tense[] = ["present", "past", "future", "aorist", "ability", "want", "necessity", "evidential"];
/** Imperatives only exist for "you" (one friend) and "you" (polite / several people). */
export const IMPERATIVE_PERSONS: Person[] = ["2sg", "2pl"];

export interface ConjugateOptions {
  negative?: boolean;
  question?: boolean;
}

export function verbStem(v: VerbEntry): string {
  if (v.stem) return v.stem;
  return v.infinitive.replace(/m[ae]k$/, "");
}

/** Last word of a (possibly compound) stem: "teşekkür et" → "et". */
function lastWord(s: string) {
  const i = s.lastIndexOf(" ");
  return i === -1 ? s : s.slice(i + 1);
}

/** de- and ye- narrow their vowel before a y-buffered suffix: diyor, yiyecek, yiyebilir. */
function isNarrowingStem(stem: string) {
  const w = lastWord(stem);
  return w === "de" || w === "ye";
}

/** Stem as it appears before a vowel-initial suffix. */
function vowelStem(v: VerbEntry, rules: RuleTag[]): string {
  const stem = verbStem(v);
  if (v.softens && !endsWithVowel(stem)) {
    rules.push("irregular-stem", "consonant-softening");
    return soften(stem);
  }
  return stem;
}

/** Stem before a (y)-buffered suffix (future, ability): de → di, ye → yi. */
function yStem(v: VerbEntry, rules: RuleTag[]): string {
  const stem = verbStem(v);
  if (endsWithVowel(stem)) {
    if (isNarrowingStem(stem)) {
      rules.push("vowel-narrowing");
      return stem.slice(0, -1) + "i";
    }
    return stem;
  }
  return vowelStem(v, rules);
}

// Person endings ------------------------------------------------------------

/** Type 1 (z-type) endings used by -yor, future, aorist, copula. */
const TYPE1: Record<Person, string> = {
  "1sg": "(y)Im",
  "2sg": "sIn",
  "3sg": "",
  "1pl": "(y)Iz",
  "2pl": "sInIz",
  "3pl": "lAr",
};
/** Type 2 (k-type) endings used by the past tense -DI. */
const TYPE2: Record<Person, string> = {
  "1sg": "m",
  "2sg": "n",
  "3sg": "",
  "1pl": "k",
  "2pl": "nIz",
  "3pl": "lAr",
};

/** Attach a type-1 ending to a base that may end in -AcAk (k → ğ before vowels). */
function attachType1(base: string, person: Person, rules: RuleTag[]): { base: string; ending: string } {
  const tpl = TYPE1[person];
  if (!tpl) return { base, ending: "" };
  let b = base;
  if (tpl.startsWith("(y)") && !endsWithVowel(b) && /[ae]c[ae]k$/.test(b)) {
    b = b.slice(0, -1) + "ğ"; // geleceğim, yapacağız
    rules.push("consonant-softening");
  }
  return { base: b, ending: applyTemplate(b, tpl) };
}

/** Question particle + type-1 ending: "musun", "miyim", "mı" (3pl keeps -lAr on the verb). */
function questionType1(verbForm: string, person: Person): { verb: string; q: string } {
  if (person === "3pl") {
    const pl = verbForm + applyTemplate(verbForm, "lAr");
    return { verb: pl, q: "m" + harmonyI(pl) };
  }
  const mi = "m" + harmonyI(verbForm);
  return { verb: verbForm, q: mi + applyTemplate(mi, TYPE1[person]) };
}

// Tenses --------------------------------------------------------------------

export function conjugate(v: VerbEntry, tense: Tense, person: Person, opts: ConjugateOptions = {}): Inflected {
  switch (tense) {
    case "present":
      return presentContinuous(v, person, opts);
    case "past":
      return past(v, person, opts);
    case "future":
      return future(v, person, opts);
    case "aorist":
      return aorist(v, person, opts);
    case "ability":
      return ability(v, person, opts);
    case "imperative":
      return imperative(v, person, opts);
    case "want":
      return want(v, person, opts);
    case "necessity":
      return necessity(v, person, opts);
    case "evidential":
      return evidential(v, person, opts);
    case "conditional":
      return conditional(v, person, opts);
    case "pastcont":
      return pastContinuous(v, person, opts);
  }
}

/** Persons a tense can be used with. */
export function personsFor(tense: Tense): Person[] {
  return tense === "imperative" ? IMPERATIVE_PERSONS : PERSONS;
}

/** -(I)yor: geliyorum, başlıyor, okuyor, gidiyor, gelmiyorum. */
function presentContinuous(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = ["vowel-harmony-4"];
  const stem = verbStem(v);
  let root: string;
  let parts: string[];
  if (opts.negative) {
    // gel + mi + yor : the negative -mA- narrows to -mI- before -yor
    root = stem;
    const neg = "m" + harmonyI(stem);
    parts = [stem, neg, "yor"];
  } else if (endsWithVowel(stem)) {
    const without = stem.slice(0, -1);
    if (isNarrowingStem(stem)) {
      // de → diyor, ye → yiyor
      root = without + "i";
      parts = [root, "yor"];
      rules.push("vowel-narrowing");
    } else {
      // başla → başl + ı + yor ; bekle → bekl + i + yor ; oku → ok + u + yor
      root = without;
      parts = [root, harmonyI(without) + "yor"];
      rules.push("vowel-narrowing");
    }
  } else {
    root = vowelStem(v, rules);
    parts = [root, harmonyI(root) + "yor"];
  }
  const verbForm = parts.join("");
  if (opts.question) {
    const { verb, q } = questionType1(verbForm, person);
    const extra = verb.slice(verbForm.length);
    return { form: `${verb} ${q}`, parts: [...parts, ...(extra ? [extra] : []), q], rules };
  }
  // -yor is always followed by u-type endings (yorum, yorsun, yoruz…)
  const ending = applyTemplate(verbForm, TYPE1[person]);
  return { form: verbForm + ending, parts: ending ? [...parts, ending] : parts, rules };
}

/** -DI: geldim, yaptım, gittim, gelmedim; question: geldin mi? */
function past(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = ["vowel-harmony-4"];
  const stem = verbStem(v);
  const parts = [stem];
  let cur = stem;
  if (opts.negative) {
    const neg = "m" + harmonyA(stem);
    parts.push(neg);
    cur += neg;
    rules.push("vowel-harmony-2");
  }
  const di = applyTemplate(cur, "DI");
  if (di.startsWith("t")) rules.push("consonant-assimilation");
  parts.push(di);
  cur += di;
  const ending = applyTemplate(cur, TYPE2[person]);
  if (ending) parts.push(ending);
  const verbForm = cur + ending;
  if (opts.question) {
    const q = "m" + harmonyI(verbForm);
    return { form: `${verbForm} ${q}`, parts: [...parts, q], rules };
  }
  return { form: verbForm, parts, rules };
}

/** -(y)AcAk: geleceğim, yapacağım, başlayacak, gideceğiz, gelmeyeceğim. */
function future(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = ["vowel-harmony-2"];
  const stem = verbStem(v);
  let parts: string[];
  let cur: string;
  if (opts.negative) {
    const neg = "m" + harmonyA(stem);
    const fut = applyTemplate(stem + neg, "(y)AcAk");
    parts = [stem, neg, fut];
    cur = stem + neg + fut;
    rules.push("buffer-y");
  } else {
    const root = yStem(v, rules);
    const fut = applyTemplate(root, "(y)AcAk");
    if (endsWithVowel(root)) rules.push("buffer-y");
    parts = [root, fut];
    cur = root + fut;
  }
  if (opts.question) {
    const { verb, q } = questionType1(cur, person);
    const extra = verb.slice(cur.length);
    return { form: `${verb} ${q}`, parts: [...parts, ...(extra ? [extra] : []), q], rules };
  }
  const { base, ending } = attachType1(cur, person, rules);
  if (base !== cur) parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1) + "ğ";
  return { form: base + ending, parts: ending ? [...parts, ending] : parts, rules: [...new Set(rules)] };
}

const NEG_AORIST: Record<Person, string> = {
  "1sg": "m",
  "2sg": "zsIn",
  "3sg": "z",
  "1pl": "yIz",
  "2pl": "zsInIz",
  "3pl": "zlAr",
};

/** Aorist (habitual): gelirim, yaparım, okurum; negative gelmem, gelmezsin, gelmeyiz. */
function aorist(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = ["vowel-harmony-4"];
  const stem = verbStem(v);
  if (opts.negative) {
    const neg = "m" + harmonyA(stem);
    rules.push("vowel-harmony-2");
    if (opts.question) {
      // gelmez miyim? gelmez misin? gelmezler mi?
      const base = stem + neg + "z";
      const { verb, q } = questionType1(base, person);
      const extra = verb.slice(base.length);
      return { form: `${verb} ${q}`, parts: [stem, neg + "z", ...(extra ? [extra] : []), q], rules };
    }
    const ending = applyTemplate(stem + neg, NEG_AORIST[person]);
    return { form: stem + neg + ending, parts: [stem, neg, ending], rules };
  }
  const base = aoristBase(v);
  const aorSuffix = base.slice(aoristRoot(v).length);
  const parts = [aoristRoot(v), aorSuffix];
  if (opts.question) {
    const { verb, q } = questionType1(base, person);
    const extra = verb.slice(base.length);
    return { form: `${verb} ${q}`, parts: [...parts, ...(extra ? [extra] : []), q], rules };
  }
  const ending = applyTemplate(base, TYPE1[person]);
  return { form: base + ending, parts: ending ? [...parts, ending] : parts, rules };
}

/** Full 3sg aorist for the verb (compound verbs keep their first words: "teşekkür eder"). */
export function aoristBase(v: VerbEntry): string {
  return v.aorist;
}

function aoristRoot(v: VerbEntry): string {
  // gelir → gel, gider → gid, okur → oku, yapar → yap
  const a = v.aorist;
  if (/[aeıiuü]r$/.test(a) && !endsWithVowel(verbStem(v))) return a.slice(0, -2);
  return a.slice(0, -1);
}

/** -(y)Abil + aorist: gelebilirim, başlayabilir, gidebilirsin; negative gelemem, gelemezsin. */
function ability(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = ["vowel-harmony-2"];
  const root = yStem(v, rules);
  if (endsWithVowel(root)) rules.push("buffer-y");
  if (opts.negative) {
    // gel + e + me + z : -(y)A-mA-z (no "bil")
    const a = applyTemplate(root, "(y)A");
    const neg = "m" + harmonyA(root + a);
    if (opts.question) {
      const base = root + a + neg + "z";
      const { verb, q } = questionType1(base, person);
      const extra = verb.slice(base.length);
      return { form: `${verb} ${q}`, parts: [root, a, neg + "z", ...(extra ? [extra] : []), q], rules };
    }
    const ending = applyTemplate(root + a + neg, NEG_AORIST[person]);
    return { form: root + a + neg + ending, parts: [root, a, neg, ending], rules };
  }
  const bil = applyTemplate(root, "(y)Abil");
  const base = root + bil + "ir";
  if (opts.question) {
    const { verb, q } = questionType1(base, person);
    const extra = verb.slice(base.length);
    return { form: `${verb} ${q}`, parts: [root, bil, "ir", ...(extra ? [extra] : []), q], rules };
  }
  const ending = applyTemplate(base, TYPE1[person]);
  return { form: base + ending, parts: ending ? [root, bil, "ir", ending] : [root, bil, "ir"], rules };
}

/** Imperative: gel! / gelin; başla / başlayın; negative gelme / gelmeyin. Only 2sg and 2pl. */
function imperative(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = [];
  const stem = verbStem(v);
  const plural = person !== "2sg";
  if (opts.negative) {
    const neg = "m" + harmonyA(stem);
    rules.push("vowel-harmony-2");
    if (!plural) return { form: stem + neg, parts: [stem, neg], rules };
    const end = applyTemplate(stem + neg, "(y)In");
    rules.push("buffer-y", "vowel-harmony-4");
    return { form: stem + neg + end, parts: [stem, neg, end], rules };
  }
  if (!plural) return { form: stem, parts: [stem], rules };
  // ye → yiyin (de keeps deyin)
  const root = lastWord(stem) === "ye" ? (rules.push("vowel-narrowing"), stem.slice(0, -1) + "i") : vowelStem(v, rules);
  const end = applyTemplate(root, "(y)In");
  rules.push("vowel-harmony-4");
  if (endsWithVowel(root)) rules.push("buffer-y");
  return { form: root + end, parts: [root, end], rules: [...new Set(rules)] };
}

/** -mAk istemek: gelmek istiyorum, gelmek istemiyorum, gelmek istiyor musun? */
const ISTEMEK: VerbEntry = { infinitive: "istemek", aorist: "ister" };
function want(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const inf = v.infinitive;
  const iste = presentContinuous(ISTEMEK, person, opts);
  return { form: `${inf} ${iste.form}`, parts: [verbStem(v), inf.slice(verbStem(v).length), ...iste.parts], rules: ["vowel-harmony-2", ...iste.rules] };
}

/** -mAlI: gelmeliyim, gelmelisin, gelmeli; negative gelmemeliyim; question gelmeli miyim? */
function necessity(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = ["vowel-harmony-2", "vowel-harmony-4"];
  const stem = verbStem(v);
  const parts = [stem];
  let cur = stem;
  if (opts.negative) {
    const neg = "m" + harmonyA(stem);
    parts.push(neg);
    cur += neg;
  }
  const mali = applyTemplate(cur, "mAlI");
  parts.push(mali);
  cur += mali;
  if (opts.question) {
    const { verb, q } = questionType1(cur, person);
    const extra = verb.slice(cur.length);
    return { form: `${verb} ${q}`, parts: [...parts, ...(extra ? [extra] : []), q], rules };
  }
  const ending = applyTemplate(cur, TYPE1[person]);
  if (ending.startsWith("y")) rules.push("buffer-y");
  return { form: cur + ending, parts: ending ? [...parts, ending] : parts, rules };
}

/** -mIş (heard / found out): gelmişim, gelmiş, gelmemiş; question gelmiş mi? */
function evidential(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = ["vowel-harmony-4"];
  const stem = verbStem(v);
  const parts = [stem];
  let cur = stem;
  if (opts.negative) {
    const neg = "m" + harmonyA(stem);
    parts.push(neg);
    cur += neg;
    rules.push("vowel-harmony-2");
  }
  const mis = applyTemplate(cur, "mIş");
  parts.push(mis);
  cur += mis;
  if (opts.question) {
    const { verb, q } = questionType1(cur, person);
    const extra = verb.slice(cur.length);
    return { form: `${verb} ${q}`, parts: [...parts, ...(extra ? [extra] : []), q], rules };
  }
  const ending = applyTemplate(cur, TYPE1[person]);
  return { form: cur + ending, parts: ending ? [...parts, ending] : parts, rules };
}

/** Aorist + -sA (real "if"): gelirsem, gelirse, gelirlerse; negative gelmezsem. No question form. */
function conditional(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const rules: RuleTag[] = ["vowel-harmony-2"];
  const stem = verbStem(v);
  let parts: string[];
  let base: string;
  if (opts.negative) {
    const neg = "m" + harmonyA(stem);
    base = stem + neg + "z";
    parts = [stem, neg + "z"];
  } else {
    base = aoristBase(v);
    parts = [aoristRoot(v), base.slice(aoristRoot(v).length)];
    rules.push("vowel-harmony-4");
  }
  if (person === "3pl") {
    const ler = applyTemplate(base, "lAr");
    const se = applyTemplate(base + ler, "sA");
    return { form: base + ler + se, parts: [...parts, ler, se], rules };
  }
  const se = applyTemplate(base, "sA");
  const ending = applyTemplate(base + se, TYPE2[person]);
  return { form: base + se + ending, parts: ending ? [...parts, se, ending] : [...parts, se], rules };
}

/** -(I)yordu: geliyordum, geliyordu, geliyorlardı; negative gelmiyordum. No question form. */
function pastContinuous(v: VerbEntry, person: Person, opts: ConjugateOptions): Inflected {
  const pres = presentContinuous(v, "3sg", { negative: opts.negative });
  const base = pres.form; // geliyor / gelmiyor
  if (person === "3pl") return { form: `${base}lardı`, parts: [...pres.parts, "lar", "dı"], rules: pres.rules };
  const ending = { "1sg": "m", "2sg": "n", "3sg": "", "1pl": "k", "2pl": "nuz", "3pl": "" }[person];
  return { form: `${base}du${ending}`, parts: [...pres.parts, "du", ...(ending ? [ending] : [])], rules: pres.rules };
}

/**
 * Expected aorist by the regular rule — used to sanity-check the vocabulary file:
 * vowel stem → -r ; one-syllable consonant stem → -Ar (13 exceptions take -Ir) ; longer → -Ir.
 */
export const AORIST_IR_MONOSYLLABLES = ["al", "bil", "bul", "dur", "gel", "gör", "kal", "ol", "öl", "san", "var", "ver", "vur"];

export function regularAorist(stem: string, softens = false): string {
  const w = lastWord(stem);
  const prefix = stem.slice(0, stem.length - w.length);
  if (endsWithVowel(w)) return prefix + w + "r";
  const syllables = [...w].filter((c) => "aeıioöuü".includes(c)).length;
  const base = softens ? soften(w) : w;
  // Softening verbs are git/et/tat… and compounds of et written as one word (kaybet, hisset):
  // they behave like the monosyllable they end in → -Ar (kaybeder, hisseder).
  if (softens || (syllables === 1 && !AORIST_IR_MONOSYLLABLES.includes(w))) return prefix + base + harmonyA(w) + "r";
  return prefix + base + harmonyI(w) + "r";
}

export { lastChar };
