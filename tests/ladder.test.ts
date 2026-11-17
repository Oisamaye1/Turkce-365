import { describe, expect, it } from "vitest";
import { exerciseFor, letterHint, wordCount, type Exercise } from "@/lib/srs/ladder";

const walk = (tr: string, stage: number, n = 7): Exercise[] =>
  Array.from({ length: n }, (_, reps) => exerciseFor({ direction: "en-tr", repetitions: reps, stage, tr }));

describe("review ladder", () => {
  it("a beginner's first test of a new word is recognition, never typing", () => {
    for (const tr of ["merhaba", "teşekkür ederim", "yavaş konuşur musunuz"]) {
      expect(exerciseFor({ direction: "en-tr", repetitions: 0, isNew: true, stage: 1, tr })).toBe("choose-meaning");
    }
  });

  it("single words climb: recognise → pick → hint → type", () => {
    expect(walk("merhaba", 1, 5)).toEqual(["choose-meaning", "choose-turkish", "type-hint", "type", "type"]);
  });

  it("beginners build long phrases from tiles and never type them without a hint", () => {
    const steps = walk("yavaş konuşur musunuz", 1, 8);
    expect(steps.slice(0, 4)).toEqual(["choose-meaning", "choose-turkish", "build", "build"]);
    expect(steps).not.toContain("type");
  });

  it("later stages start higher and reach typing sooner", () => {
    expect(exerciseFor({ direction: "en-tr", repetitions: 0, stage: 3, tr: "kahve" })).toBe("choose-turkish");
    expect(exerciseFor({ direction: "en-tr", repetitions: 1, stage: 5, tr: "kahve" })).toBe("type");
    expect(exerciseFor({ direction: "en-tr", repetitions: 0, isNew: true, stage: 4, tr: "kahve" })).toBe("choose-turkish");
  });

  it("a missed card (repetitions back to 0) drops to the bottom of the ladder", () => {
    expect(exerciseFor({ direction: "en-tr", repetitions: 0, stage: 2, tr: "iyi akşamlar" })).toBe("choose-meaning");
  });

  it("meaning cards and corrections have their own paths", () => {
    expect(exerciseFor({ direction: "tr-en", repetitions: 4, stage: 1, tr: "ev" })).toBe("choose-meaning");
    expect(exerciseFor({ direction: "tr-en", repetitions: 2, stage: 3, tr: "ev" })).toBe("type");
    expect(exerciseFor({ direction: "en-tr", repetitions: 0, stage: 1, tr: "Kitabı okudum", pos: "correction" })).toBe("build");
  });

  it("hints show first letters and length", () => {
    expect(letterHint("teşekkür ederim")).toBe("t _ _ _ _ _ _ _   e _ _ _ _ _");
    expect(wordCount("de / da")).toBe(1);
    expect(wordCount("hoş bulduk")).toBe(2);
  });
});
