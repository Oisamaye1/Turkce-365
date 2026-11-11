import { describe, expect, it } from "vitest";
import path from "node:path";
import vocabJson from "../data/vocab.json";
import { parseVocabSources } from "../scripts/build-vocab";
import type { VocabEntry } from "@/lib/vocab/types";
import { buildLexicon, generateDrills, generateMixedDrills, nounEntry, seededRng, verbEntry } from "@/lib/grammar/drills";
import { GRAMMAR_STEPS } from "@/lib/grammar/steps";
import { englishVerbPhrase, pluralize } from "@/lib/grammar/english";
import { checkTurkish, conjugate, inflectNoun, regularAorist } from "@/lib/turkish";

const vocab = vocabJson as VocabEntry[];
const byTr = (tr: string, pos?: string) => vocab.find((v) => v.tr === tr && (!pos || v.pos === pos));

describe("vocabulary source", () => {
  const built = parseVocabSources(path.resolve(__dirname, "../data/vocab-src"));
  it("builds without validation errors", () => expect(built.errors).toEqual([]));
  it("has ~1,500 entries in themed units of ~25", () => {
    expect(built.entries.length).toBe(1500);
    expect(built.units.length).toBe(60);
  });
  it("data/vocab.json is up to date with the sources", () => {
    expect(vocab.length).toBe(built.entries.length);
    expect(vocab.map((v) => v.tr)).toEqual(built.entries.map((v) => v.tr));
  });
  it("matches the spec's starter sample", () => {
    expect(byTr("merhaba")).toMatchObject({ en: "hello", pos: "phrase", unit: 1 });
    expect(byTr("teşekkür ederim")?.pos).toBe("phrase");
    expect(byTr("evet")?.pos).toBe("adv");
    expect(byTr("hayır")?.pos).toBe("adv");
    expect(byTr("su")?.softens).toBeFalsy();
    expect(byTr("ekmek")?.softens).toBe(true);
    expect(byTr("kitap")?.softens).toBe(true);
    expect(byTr("gelmek")).toMatchObject({ stem: "gel", aorist: "gelir" });
    expect(byTr("gitmek")).toMatchObject({ stem: "git", aorist: "gider", irregular: "git → gid- before vowels" });
  });
  it("every noun/adjective ending in p/ç/t/k has an explicit softens flag", () => {
    const missing = vocab.filter(
      (v) => (v.pos === "noun" || v.pos === "adj") && !v.tr.includes(" ") && !v.compound && !v.doubles && /[pçtk]$/.test(v.tr) && v.softens === undefined,
    );
    expect(missing.map((v) => v.tr)).toEqual([]);
  });
  it("every verb has an aorist consistent with the aorist rule", () => {
    for (const v of vocab.filter((x) => x.pos === "verb")) {
      expect(v.aorist, v.tr).toBeTruthy();
      expect(regularAorist(v.stem!, !!v.irregular), v.tr).toBe(v.aorist);
    }
  });
  it("every entry has an example sentence with translation", () => {
    expect(vocab.filter((v) => !v.exTr || !v.exEn).map((v) => v.tr)).toEqual([]);
  });
  it("no duplicate (tr, pos) pairs", () => {
    const keys = vocab.map((v) => `${v.tr}|${v.pos}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("engine inflects every drillable noun without throwing", () => {
    for (const v of vocab.filter((x) => x.pos === "noun" && !x.tr.includes(" ") && !x.compound)) {
      const f = inflectNoun(nounEntry(v), { plural: true, possessive: "1sg", case: "abl" }).form;
      expect(f.startsWith(v.tr.slice(0, 2)), v.tr).toBe(true);
    }
  });
  it("engine conjugates every verb without throwing", () => {
    for (const v of vocab.filter((x) => x.pos === "verb")) {
      expect(conjugate(verbEntry(v), "present", "1sg").form).toMatch(/yorum$/);
      expect(conjugate(verbEntry(v), "future", "1sg").form).toMatch(/[ae]c[ae]ğım$|[ae]ceğim$/);
    }
  });
});

describe("drill generator", () => {
  const lex = buildLexicon(vocab);
  for (const step of GRAMMAR_STEPS) {
    it(`step ${step.id} (${step.slug}) produces 8 distinct drills whose answer checks as correct`, () => {
      const drills = generateDrills(step.id, 8, lex, seededRng(step.id * 7));
      expect(drills.length).toBe(8);
      expect(new Set(drills.map((d) => d.answer)).size).toBe(8);
      for (const d of drills) {
        expect(d.prompt.length).toBeGreaterThan(2);
        expect(checkTurkish(d.answer, d.answer, { typoTolerance: false }).result).toBe("correct");
        expect(d.ruleTag).toBe(step.tag);
      }
    });
  }
  it("is deterministic with a seed", () => {
    const a = generateDrills(16, 5, lex, seededRng("2026-11-11")).map((d) => d.answer);
    const b = generateDrills(16, 5, lex, seededRng("2026-11-11")).map((d) => d.answer);
    expect(a).toEqual(b);
  });
  it("mixed drills cover several steps", () => {
    const m = generateMixedDrills(10, 10, lex, seededRng(3));
    expect(m.length).toBeGreaterThanOrEqual(8);
  });
  it("prefers known words when enough are available", () => {
    const known = new Set(vocab.filter((v) => v.unit <= 12).map((v) => v.tr));
    const l = buildLexicon(vocab, known);
    expect(l.nouns.every((n) => known.has(n.tr))).toBe(true);
  });
});

describe("grammar steps", () => {
  it("has 16 steps in the spec order", () => {
    expect(GRAMMAR_STEPS.map((s) => s.id)).toEqual([...Array(16)].map((_, i) => i + 1));
  });
  it("explanations are at most 120 words", () => {
    for (const s of GRAMMAR_STEPS) expect(s.explanation.split(/\s+/).length, s.slug).toBeLessThanOrEqual(120);
  });
});

describe("english helpers", () => {
  it("pluralize", () => {
    expect(pluralize("house")).toBe("houses");
    expect(pluralize("child")).toBe("children");
    expect(pluralize("city")).toBe("cities");
    expect(pluralize("bus")).toBe("buses");
  });
  it("verb phrases", () => {
    expect(englishVerbPhrase("to come", "present", "1sg")).toBe("I am coming");
    expect(englishVerbPhrase("to go", "past", "1pl")).toBe("We went");
    expect(englishVerbPhrase("to go", "past", "2sg", { question: true })).toBe("Did you go?");
    expect(englishVerbPhrase("to do / to make", "future", "3pl", { negative: true })).toBe("They will not do");
    expect(englishVerbPhrase("to be afraid", "present", "1sg")).toBe("I am afraid");
    expect(englishVerbPhrase("to wake up", "ability", "3sg")).toBe("He/she can wake up");
  });
});
