/**
 * Tiny English helpers to phrase drill prompts ("from my houses", "we will go").
 * Deliberately simple; drill cards also show structured tags, so a slightly
 * awkward English hint is never the only information.
 */
import type { Person } from "@/lib/turkish/nouns";

/** First gloss without parenthetical notes: "teacher / professor (colloquial)" → "teacher". */
export function firstGloss(en: string): string {
  return en.split(/\s*\/\s*|\s*;\s*/)[0].replace(/\(.*?\)/g, "").trim();
}

const IRREGULAR_PLURALS: Record<string, string> = {
  child: "children",
  person: "people",
  man: "men",
  woman: "women",
  foot: "feet",
  tooth: "teeth",
  mouse: "mice",
  sheep: "sheep",
  fish: "fish",
  knife: "knives",
  life: "lives",
  wife: "wives",
  leaf: "leaves",
  grapes: "grapes",
  trousers: "trousers",
  glasses: "glasses",
  shoes: "shoes",
  clothes: "clothes",
  beans: "beans",
  lentils: "lentils",
  chickpeas: "chickpeas",
  spices: "spices",
  meatballs: "meatballs",
  stairs: "stairs",
  news: "news",
  data: "data",
};

export function pluralize(noun: string): string {
  const words = noun.split(" ");
  const last = words[words.length - 1];
  let p: string;
  if (IRREGULAR_PLURALS[last]) p = IRREGULAR_PLURALS[last];
  else if (/[^aeiou]y$/.test(last)) p = last.slice(0, -1) + "ies";
  else if (/(s|x|z|ch|sh)$/.test(last)) p = last + "es";
  else p = last + "s";
  return [...words.slice(0, -1), p].join(" ");
}

export const POSSESSIVE_EN: Record<Person, string> = {
  "1sg": "my",
  "2sg": "your",
  "3sg": "his/her",
  "1pl": "our",
  "2pl": "your (pl.)",
  "3pl": "their",
};

export const SUBJECT_EN: Record<Person, string> = {
  "1sg": "I",
  "2sg": "you",
  "3sg": "he/she",
  "1pl": "we",
  "2pl": "you (pl.)",
  "3pl": "they",
};

const BE_PRESENT: Record<Person, string> = {
  "1sg": "am",
  "2sg": "are",
  "3sg": "is",
  "1pl": "are",
  "2pl": "are",
  "3pl": "are",
};

const IRREGULAR_PAST: Record<string, string> = {
  be: "was",
  become: "became",
  begin: "began",
  bring: "brought",
  build: "built",
  buy: "bought",
  catch: "caught",
  choose: "chose",
  come: "came",
  cut: "cut",
  do: "did",
  draw: "drew",
  drink: "drank",
  drive: "drove",
  eat: "ate",
  fall: "fell",
  feel: "felt",
  find: "found",
  fly: "flew",
  forget: "forgot",
  get: "got",
  give: "gave",
  go: "went",
  grow: "grew",
  hang: "hung",
  have: "had",
  hear: "heard",
  hide: "hid",
  hold: "held",
  hurt: "hurt",
  keep: "kept",
  know: "knew",
  lead: "led",
  leave: "left",
  lend: "lent",
  let: "let",
  lie: "lay",
  light: "lit",
  lose: "lost",
  make: "made",
  mean: "meant",
  meet: "met",
  pay: "paid",
  put: "put",
  read: "read",
  ride: "rode",
  run: "ran",
  say: "said",
  see: "saw",
  sell: "sold",
  send: "sent",
  set: "set",
  show: "showed",
  sing: "sang",
  sit: "sat",
  sleep: "slept",
  speak: "spoke",
  spend: "spent",
  stand: "stood",
  swim: "swam",
  take: "took",
  teach: "taught",
  tell: "told",
  think: "thought",
  throw: "threw",
  understand: "understood",
  wake: "woke",
  wear: "wore",
  win: "won",
  write: "wrote",
};

/** "to wake up" → { base: "wake", rest: " up" } */
export function splitVerb(en: string): { base: string; rest: string } {
  const g = firstGloss(en).replace(/^to\s+/, "");
  const i = g.indexOf(" ");
  return i === -1 ? { base: g, rest: "" } : { base: g.slice(0, i), rest: g.slice(i) };
}

function ing(base: string): string {
  if (base === "be") return "being";
  if (/ie$/.test(base)) return base.slice(0, -2) + "ying";
  if (/[^e]e$/.test(base) && base !== "see") return base.slice(0, -1) + "ing";
  if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(base) && base.length <= 4) return base + base.slice(-1) + "ing";
  return base + "ing";
}

function past(base: string): string {
  if (IRREGULAR_PAST[base]) return IRREGULAR_PAST[base];
  if (/e$/.test(base)) return base + "d";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ied";
  if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(base) && base.length <= 4) return base + base.slice(-1) + "ed";
  return base + "ed";
}

function third(base: string): string {
  if (base === "be") return "is";
  if (base === "have") return "has";
  if (/(s|x|z|ch|sh|o)$/.test(base)) return base + "es";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ies";
  return base + "s";
}

export type EnTense = "present" | "past" | "future" | "aorist" | "ability";

export function englishVerbPhrase(
  en: string,
  tense: EnTense,
  person: Person,
  opts: { negative?: boolean; question?: boolean } = {},
): string {
  const { base, rest } = splitVerb(en);
  const subj = SUBJECT_EN[person];
  const neg = opts.negative;
  const q = opts.question;
  let s: string;
  if (base === "be") {
    // "to be afraid", "to be sure": keep 'be' as a copula in English.
    const be = BE_PRESENT[person];
    const was = person === "1sg" || person === "3sg" ? "was" : "were";
    const n = neg ? " not" : "";
    switch (tense) {
      case "present":
        s = q ? `${cap(be)} ${subj}${n}${rest}?` : `${subj} ${be}${n}${rest}`;
        break;
      case "past":
        s = q ? `${cap(was)} ${subj}${n}${rest}?` : `${subj} ${was}${n}${rest}`;
        break;
      case "future":
        s = q ? `Will ${subj}${n} be${rest}?` : `${subj} will${n} be${rest}`;
        break;
      case "aorist":
        s = q ? `${cap(be)} ${subj}${n} usually${rest}?` : `${subj} ${be}${n} usually${rest}`;
        break;
      case "ability":
        s = q ? `Can ${subj}${n} be${rest}?` : `${subj} ${neg ? "cannot" : "can"} be${rest}`;
        break;
    }
    return cap(s);
  }
  switch (tense) {
    case "present": {
      const be = BE_PRESENT[person];
      s = q ? `${cap(be)} ${subj}${neg ? " not" : ""} ${ing(base)}${rest}?` : `${subj} ${be}${neg ? " not" : ""} ${ing(base)}${rest}`;
      break;
    }
    case "past":
      s = q
        ? `Did ${subj}${neg ? " not" : ""} ${base}${rest}?`
        : neg
          ? `${subj} did not ${base}${rest}`
          : `${subj} ${past(base)}${rest}`;
      break;
    case "future":
      s = q ? `Will ${subj}${neg ? " not" : ""} ${base}${rest}?` : `${subj} will${neg ? " not" : ""} ${base}${rest}`;
      break;
    case "aorist": {
      const does = person === "3sg" ? "does" : "do";
      s = q
        ? `${cap(does)} ${subj}${neg ? " not" : ""} (usually) ${base}${rest}?`
        : neg
          ? `${subj} ${does} not (usually) ${base}${rest}`
          : `${subj} (usually) ${person === "3sg" ? third(base) : base}${rest}`;
      break;
    }
    case "ability":
      s = q ? `Can ${subj}${neg ? " not" : ""} ${base}${rest}?` : `${subj} ${neg ? "cannot" : "can"} ${base}${rest}`;
      break;
  }
  return cap(s);
}

export function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
