/**
 * Offline word analyzer: runs the suffix engine "backwards" by generating the
 * common inflections of every vocabulary noun/verb and indexing them.
 * Used to show meanings + suffix breakdowns when tapping words in a dialogue.
 */
import vocabJson from "../../../data/vocab.json";
import type { VocabEntry } from "@/lib/vocab/types";
import { conjugate, copula, inflectNoun, trLower, type Case, type Person, type Tense } from "@/lib/turkish";
import { nounEntry, verbEntry, TENSE_LABEL } from "@/lib/grammar/drills";
import { POSSESSIVE_EN, SUBJECT_EN, firstGloss } from "@/lib/grammar/english";

export interface WordAnalysis {
  word: string;
  root: string;
  meaning: string;
  parts: string[];
  description: string;
}

const PERSONS: Person[] = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"];
const CASES: Case[] = ["nom", "acc", "dat", "loc", "abl", "gen", "ins"];
const TENSES: Tense[] = ["present", "past", "future", "aorist", "ability"];
const CASE_LABEL: Record<Case, string> = {
  nom: "",
  acc: "object",
  dat: "to",
  loc: "in/at",
  abl: "from",
  gen: "of",
  ins: "with",
};

let index: Map<string, WordAnalysis> | null = null;

function add(map: Map<string, WordAnalysis>, form: string, a: Omit<WordAnalysis, "word">) {
  const key = trLower(form);
  // Prefer the analysis with fewer parts (simpler reading) when forms collide.
  const prev = map.get(key);
  if (!prev || prev.parts.length > a.parts.length) map.set(key, { word: form, ...a });
}

function build(): Map<string, WordAnalysis> {
  const map = new Map<string, WordAnalysis>();
  const vocab = vocabJson as VocabEntry[];
  for (const v of vocab) {
    const meaning = firstGloss(v.en);
    if (!v.tr.includes(" ")) add(map, v.tr, { root: v.tr, meaning: v.en, parts: [v.tr], description: v.pos });
    if ((v.pos === "noun" || v.pos === "proper") && !v.tr.includes(" ") && !v.compound && !v.tr.includes("/")) {
      const n = nounEntry(v);
      for (const plural of [false, true]) {
        for (const poss of [undefined, ...PERSONS]) {
          if (v.pos === "proper" && poss) continue;
          for (const c of CASES) {
            if (!plural && !poss && c === "nom") continue;
            const r = inflectNoun(n, { plural, possessive: poss, case: c });
            const desc = [plural ? "plural" : "", poss ? POSSESSIVE_EN[poss] : "", CASE_LABEL[c]].filter(Boolean).join(" · ");
            add(map, r.form, { root: v.tr, meaning, parts: r.parts, description: desc });
          }
        }
      }
      for (const p of PERSONS) {
        const r = copula(n, p);
        if (r.form !== v.tr) add(map, r.form, { root: v.tr, meaning, parts: r.parts, description: `${SUBJECT_EN[p]} + to be` });
      }
    }
    if (v.pos === "adj" && !v.tr.includes(" ")) {
      for (const p of PERSONS) {
        const r = copula(nounEntry(v), p);
        if (r.form !== v.tr) add(map, r.form, { root: v.tr, meaning, parts: r.parts, description: `${SUBJECT_EN[p]} + to be` });
      }
    }
    if (v.pos === "verb" && v.aorist && !v.tr.includes(" ")) {
      const ve = verbEntry(v);
      add(map, v.stem ?? v.tr, { root: v.tr, meaning, parts: [v.stem ?? v.tr], description: "verb stem / command" });
      for (const t of TENSES) {
        for (const p of PERSONS) {
          for (const negative of [false, true]) {
            const r = conjugate(ve, t, p, { negative });
            const desc = `${SUBJECT_EN[p]} · ${TENSE_LABEL[t]}${negative ? " · negative" : ""}`;
            add(map, r.form, { root: v.tr, meaning, parts: r.parts, description: desc });
            // Bare question stems ("geliyor" in "geliyor musun")
            if (p === "3sg") add(map, r.form, { root: v.tr, meaning, parts: r.parts, description: desc });
          }
        }
      }
    }
  }
  return map;
}

export function analyzeWord(word: string): WordAnalysis | null {
  if (!index) index = build();
  const key = trLower(word.replace(/[’‘]/g, "'"));
  return index.get(key) ?? index.get(key.replace(/'/g, "")) ?? null;
}

/** Analyse every distinct token of some Turkish text. */
export function analyzeText(text: string): Record<string, WordAnalysis> {
  const out: Record<string, WordAnalysis> = {};
  const tokens = text.match(/[A-Za-zÇĞİÖŞÜçğıöşüâîû]+(?:'[A-Za-zçğıöşüâîû]+)?/g) ?? [];
  for (const t of tokens) {
    const k = trLower(t);
    if (out[k]) continue;
    const a = analyzeWord(t);
    if (a) out[k] = a;
  }
  return out;
}
