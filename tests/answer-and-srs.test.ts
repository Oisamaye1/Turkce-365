import { describe, expect, it } from "vitest";
import { checkEnglish, checkTurkish, deasciify, levenshtein, normalizeAnswer, trCapitalize, trLower, trUpper } from "@/lib/turkish";
import { LEECH_LAPSES, NEW_CARD_STATE, schedule, suggestGrade, type SrsState } from "@/lib/srs/sm2";

describe("Turkish casing", () => {
  it("I → ı and İ → i", () => {
    expect(trLower("I")).toBe("ı");
    expect(trLower("İ")).toBe("i");
    expect(trLower("IŞIK")).toBe("ışık");
    expect(trLower("İSTANBUL")).toBe("istanbul");
    expect(trLower("ISPARTA")).toBe("ısparta");
  });
  it("i → İ and ı → I", () => {
    expect(trUpper("i")).toBe("İ");
    expect(trUpper("ı")).toBe("I");
    expect(trUpper("istanbul")).toBe("İSTANBUL");
    expect(trCapitalize("izmir")).toBe("İzmir");
  });
  it("folds a decomposed İ (I + combining dot)", () => {
    expect(trLower("İstanbul")).toBe("istanbul");
  });
  it("normalizeAnswer strips punctuation and collapses spaces", () => {
    expect(normalizeAnswer("  Merhaba,   nasılsın? ")).toBe("merhaba nasılsın");
    expect(normalizeAnswer("Ali’nin")).toBe("ali'nin");
    expect(normalizeAnswer("kâğıt")).toBe("kağıt");
  });
  it("deasciify", () => expect(deasciify("çğıöşü")).toBe("cgiosu"));
  it("levenshtein", () => {
    expect(levenshtein("kitap", "kitab")).toBe(1);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });
});

describe("checkTurkish", () => {
  it("acceptance: cok for çok is almost, not correct", () => {
    const r = checkTurkish("cok", "çok");
    expect(r.result).toBe("almost");
    expect(r.reason).toBe("missing-turkish-letters");
    expect(r.expected).toBe("çok");
  });
  it("exact and case-insensitive with Turkish rules", () => {
    expect(checkTurkish("Çok", "çok").result).toBe("correct");
    expect(checkTurkish("IŞIK", "ışık").result).toBe("correct");
    expect(checkTurkish("İyi", "iyi").result).toBe("correct");
    expect(checkTurkish("Merhaba!", "merhaba").result).toBe("correct");
  });
  it("capital I is ı in Turkish, so 'Iyi' is only almost for 'iyi'", () => {
    expect(checkTurkish("Iyi", "iyi").result).toBe("almost");
  });
  it("missing Turkish letters → almost", () => {
    expect(checkTurkish("tesekkur ederim", "teşekkür ederim").result).toBe("almost");
    expect(checkTurkish("guzel", "güzel").result).toBe("almost");
    expect(checkTurkish("ogrenci", "öğrenci").result).toBe("almost");
  });
  it("one typo in a ≥ 6-letter word → almost; shorter words → wrong", () => {
    expect(checkTurkish("öğretmn", "öğretmen").result).toBe("almost");
    expect(checkTurkish("teşekkürederim", "teşekkür ederim").result).toBe("almost");
    expect(checkTurkish("evlr", "evler").result).toBe("wrong");
    expect(checkTurkish("kedı", "kedi").result).toBe("almost"); // diacritic-only difference
    expect(checkTurkish("köpak", "köpek").result).toBe("wrong");
  });
  it("suffix drills disable typo tolerance", () => {
    expect(checkTurkish("kitapda", "kitapta", { typoTolerance: false }).result).toBe("wrong");
    expect(checkTurkish("kitapda", "kitapta").result).toBe("almost");
    expect(checkTurkish("kitabi", "kitabı", { typoTolerance: false }).result).toBe("almost");
  });
  it("alternatives", () => {
    expect(checkTurkish("selam", "merhaba / selam").result).toBe("correct");
    expect(checkTurkish("tamam", ["olur", "tamam"]).result).toBe("correct");
    expect(checkTurkish("xyz", "merhaba / selam").result).toBe("wrong");
  });
  it("empty answer is wrong", () => expect(checkTurkish("  ", "su").result).toBe("wrong"));
});

describe("checkEnglish", () => {
  it("accepts any listed meaning, ignores 'to' and articles", () => {
    expect(checkEnglish("come", "to come").result).toBe("correct");
    expect(checkEnglish("the book", "book").result).toBe("correct");
    expect(checkEnglish("hi", "hello / hi").result).toBe("correct");
    expect(checkEnglish("helo", "hello").result).toBe("almost");
    expect(checkEnglish("dog", "cat").result).toBe("wrong");
  });
});

describe("SM-2 scheduling", () => {
  it("new card: good → 1 day, then 6 days, then × ease", () => {
    let s: SrsState = NEW_CARD_STATE;
    const r1 = schedule(s, "good");
    expect(r1.interval).toBe(1);
    expect(r1.repetitions).toBe(1);
    const r2 = schedule(r1, "good");
    expect(r2.interval).toBe(6);
    const r3 = schedule(r2, "good");
    expect(r3.interval).toBe(Math.round(6 * r2.ease));
    s = r3;
    expect(s.ease).toBeCloseTo(2.5, 5);
  });
  it("again resets repetitions, counts a lapse, relearns in 10 minutes", () => {
    const learned = { ease: 2.5, interval: 15, repetitions: 4, lapses: 0 };
    const r = schedule(learned, "again");
    expect(r.repetitions).toBe(0);
    expect(r.lapses).toBe(1);
    expect(r.dueInMinutes).toBe(10);
    expect(r.ease).toBeLessThan(2.5);
  });
  it("again on a brand-new card is not a lapse", () => {
    expect(schedule(NEW_CARD_STATE, "again").lapses).toBe(0);
  });
  it("ease never drops below 1.3", () => {
    let s: SrsState = { ...NEW_CARD_STATE };
    for (let i = 0; i < 20; i++) s = schedule({ ...s, repetitions: 2 }, "again");
    expect(s.ease).toBe(1.3);
  });
  it("easy grows faster than good, hard slower", () => {
    const st = { ease: 2.5, interval: 10, repetitions: 3, lapses: 0 };
    const hard = schedule(st, "hard").interval;
    const good = schedule(st, "good").interval;
    const easy = schedule(st, "easy").interval;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });
  it(`flags a leech at ${LEECH_LAPSES} lapses`, () => {
    const r = schedule({ ease: 1.3, interval: 3, repetitions: 2, lapses: LEECH_LAPSES - 1 }, "again");
    expect(r.isLeech).toBe(true);
  });
  it("suggestGrade from correctness and time", () => {
    expect(suggestGrade("wrong", 1000, 5)).toBe("again");
    expect(suggestGrade("almost", 1000, 5)).toBe("hard");
    expect(suggestGrade("correct", 1500, 5)).toBe("easy");
    expect(suggestGrade("correct", 6000, 5)).toBe("good");
    expect(suggestGrade("correct", 30000, 5)).toBe("hard");
  });
});
