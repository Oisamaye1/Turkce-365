import { describe, expect, it } from "vitest";
import { numberToTurkish, timeToTurkish } from "@/lib/practice/numbers";

describe("numbers in Turkish", () => {
  it("writes numbers the Turkish way", () => {
    expect(numberToTurkish(0)).toBe("sıfır");
    expect(numberToTurkish(7)).toBe("yedi");
    expect(numberToTurkish(15)).toBe("on beş");
    expect(numberToTurkish(47)).toBe("kırk yedi");
    expect(numberToTurkish(100)).toBe("yüz");
    expect(numberToTurkish(250)).toBe("iki yüz elli");
    expect(numberToTurkish(1000)).toBe("bin");
    expect(numberToTurkish(1984)).toBe("bin dokuz yüz seksen dört");
    expect(numberToTurkish(2026)).toBe("iki bin yirmi altı");
    expect(numberToTurkish(15600)).toBe("on beş bin altı yüz");
  });
});

describe("telling the time", () => {
  it("says hours, halves, quarters and minutes", () => {
    expect(timeToTurkish(3, 0)).toBe("Saat üç.");
    expect(timeToTurkish(15, 30)).toBe("Saat üç buçuk.");
    expect(timeToTurkish(3, 15)).toBe("Saat üçü çeyrek geçiyor.");
    expect(timeToTurkish(4, 20)).toBe("Saat dördü yirmi geçiyor.");
    expect(timeToTurkish(3, 45)).toBe("Saat dörde çeyrek var.");
    expect(timeToTurkish(12, 50)).toBe("Saat bire on var.");
    expect(timeToTurkish(6, 5)).toBe("Saat altıyı beş geçiyor.");
    expect(timeToTurkish(0, 0)).toBe("Saat on iki.");
  });
});

import { CHAPTERS } from "@/lib/learn/chapters";

describe("course chapters", () => {
  it("have valid quizzes and examples whose pieces spell the word", () => {
    const squash = (s: string) => s.toLocaleLowerCase("tr").replace(/[\s.,!?·]/g, "");
    expect(CHAPTERS.length).toBe(10);
    for (const c of CHAPTERS) {
      expect(c.quiz.length).toBeGreaterThanOrEqual(4);
      for (const q of c.quiz) expect(q.answer, `${c.id}: ${q.q}`).toBeLessThan(q.options.length);
      for (const s of c.sections)
        for (const e of s.examples ?? []) {
          if (!e.breakdown) continue;
          const joined = squash(e.breakdown.replace(/\+/g, ""));
          expect(squash(e.tr), `${c.id}: ${e.tr}`).toContain(joined);
        }
    }
  });
});
