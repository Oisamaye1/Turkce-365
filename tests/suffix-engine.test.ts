import { describe, expect, it } from "vitest";
import {
  applyTemplate,
  conjugate,
  copula,
  harmonyA,
  harmonyI,
  inflectNoun,
  possessiveCompound,
  questionParticle,
  regularAorist,
  soften,
  type NounEntry,
  type VerbEntry,
} from "@/lib/turkish";

// Lexicon used throughout the tests (flags exactly as stored in data/vocab.json)
const N: Record<string, NounEntry> = {
  ev: { word: "ev" },
  kitap: { word: "kitap", softens: true },
  okul: { word: "okul" },
  araba: { word: "araba" },
  çocuk: { word: "çocuk", softens: true },
  top: { word: "top", softens: false },
  saç: { word: "saç", softens: false },
  saat: { word: "saat", softens: false, harmonyOverride: "front" },
  ekmek: { word: "ekmek", softens: true },
  su: { word: "su", yBuffer: true },
  göz: { word: "göz" },
  köpek: { word: "köpek", softens: true },
  ağaç: { word: "ağaç", softens: true },
  renk: { word: "renk", softens: true },
  kedi: { word: "kedi" },
  oda: { word: "oda" },
  süt: { word: "süt", softens: false },
  şehir: { word: "şehir", dropsVowel: true },
  burun: { word: "burun", dropsVowel: true },
  hak: { word: "hak", doubles: true },
  kalp: { word: "kalp", softens: true, harmonyOverride: "front" },
  gol: { word: "gol", harmonyOverride: "front" },
  Ali: { word: "Ali", proper: true },
  Mehmet: { word: "Mehmet", proper: true },
  sokak: { word: "sokak", softens: true },
  dolap: { word: "dolap", softens: true },
  kuş: { word: "kuş" },
  ütü: { word: "ütü" },
  masa: { word: "masa" },
  gün: { word: "gün" },
  yol: { word: "yol" },
  okul2: { word: "okul" },
};

const V: Record<string, VerbEntry> = {
  gel: { infinitive: "gelmek", aorist: "gelir" },
  git: { infinitive: "gitmek", aorist: "gider", softens: true },
  et: { infinitive: "etmek", aorist: "eder", softens: true },
  yap: { infinitive: "yapmak", aorist: "yapar" },
  başla: { infinitive: "başlamak", aorist: "başlar" },
  bekle: { infinitive: "beklemek", aorist: "bekler" },
  oku: { infinitive: "okumak", aorist: "okur" },
  gör: { infinitive: "görmek", aorist: "görür" },
  otur: { infinitive: "oturmak", aorist: "oturur" },
  söyle: { infinitive: "söylemek", aorist: "söyler" },
  iç: { infinitive: "içmek", aorist: "içer" },
  ye: { infinitive: "yemek", aorist: "yer" },
  de: { infinitive: "demek", aorist: "der" },
  al: { infinitive: "almak", aorist: "alır" },
  konuş: { infinitive: "konuşmak", aorist: "konuşur" },
  yaz: { infinitive: "yazmak", aorist: "yazar" },
  uyu: { infinitive: "uyumak", aorist: "uyur" },
  teşekkürEt: { infinitive: "teşekkür etmek", aorist: "teşekkür eder", softens: true },
  çalış: { infinitive: "çalışmak", aorist: "çalışır" },
  öğren: { infinitive: "öğrenmek", aorist: "öğrenir" },
};

const noun = (k: string, spec: Parameters<typeof inflectNoun>[1]) => inflectNoun(N[k], spec).form;

describe("rule 1 — 2-way vowel harmony (a/e)", () => {
  it.each([
    ["ev", "e"],
    ["kitap", "a"],
    ["okul", "a"],
    ["göz", "e"],
    ["kuş", "a"],
    ["gün", "e"],
    ["araba", "a"],
    ["kedi", "e"],
  ])("%s → %s", (w, v) => expect(harmonyA(w)).toBe(v));
});

describe("rule 2 — 4-way vowel harmony (ı/i/u/ü)", () => {
  it.each([
    ["kitap", "ı"],
    ["kız", "ı"],
    ["ev", "i"],
    ["kedi", "i"],
    ["okul", "u"],
    ["yol", "u"],
    ["göz", "ü"],
    ["gün", "ü"],
  ])("%s → %s", (w, v) => expect(harmonyI(w)).toBe(v));
});

describe("plural -lAr (step 1)", () => {
  it.each([
    ["ev", "evler"],
    ["kitap", "kitaplar"],
    ["okul", "okullar"],
    ["göz", "gözler"],
    ["araba", "arabalar"],
    ["kedi", "kediler"],
    ["saat", "saatler"],
    ["çocuk", "çocuklar"],
  ])("%s → %s", (w, f) => expect(noun(w, { plural: true })).toBe(f));
});

describe("rule 3 — consonant assimilation (D → t after fıstıkçı şahap)", () => {
  it.each([
    ["kitap", "loc", "kitapta"],
    ["kitap", "abl", "kitaptan"],
    ["ağaç", "loc", "ağaçta"],
    ["kuş", "abl", "kuştan"],
    ["süt", "loc", "sütte"],
    ["sokak", "loc", "sokakta"],
    ["köpek", "abl", "köpekten"],
  ] as const)("%s + %s → %s", (w, c, f) => {
    const r = inflectNoun(N[w], { case: c });
    expect(r.form).toBe(f);
    expect(r.rules).toContain("consonant-assimilation");
  });
  it("voiced endings keep d", () => {
    expect(noun("ev", { case: "loc" })).toBe("evde");
    expect(noun("okul", { case: "loc" })).toBe("okulda");
    expect(noun("göz", { case: "abl" })).toBe("gözden");
    expect(noun("araba", { case: "loc" })).toBe("arabada");
    expect(noun("gün", { case: "abl" })).toBe("günden");
  });
});

describe("locative -DA (step 2)", () => {
  it.each([
    ["ev", "evde"],
    ["kitap", "kitapta"],
    ["okul", "okulda"],
    ["oda", "odada"],
    ["saat", "saatte"],
    ["şehir", "şehirde"],
    ["Ali", "Ali'de"],
  ])("%s → %s", (w, f) => expect(noun(w, { case: "loc" })).toBe(f));
});

describe("ablative -DAn (step 3)", () => {
  it.each([
    ["ev", "evden"],
    ["kitap", "kitaptan"],
    ["okul", "okuldan"],
    ["araba", "arabadan"],
    ["saat", "saatten"],
    ["Mehmet", "Mehmet'ten"],
  ])("%s → %s", (w, f) => expect(noun(w, { case: "abl" })).toBe(f));
});

describe("rule 4 — consonant softening (stored per word, not guessed)", () => {
  it("soften() swaps the final consonant", () => {
    expect(soften("kitap")).toBe("kitab");
    expect(soften("ağaç")).toBe("ağac");
    expect(soften("kanat")).toBe("kanad");
    expect(soften("çocuk")).toBe("çocuğ");
    expect(soften("renk")).toBe("reng");
  });
  it.each([
    ["kitap", "acc", "kitabı"],
    ["çocuk", "acc", "çocuğu"],
    ["ekmek", "acc", "ekmeği"],
    ["ağaç", "dat", "ağaca"],
    ["renk", "acc", "rengi"],
    ["köpek", "dat", "köpeğe"],
    ["dolap", "loc", "dolapta"],
  ] as const)("%s + %s → %s", (w, c, f) => expect(noun(w, { case: c })).toBe(f));
  it("monosyllables flagged softens:false keep their consonant", () => {
    expect(noun("top", { case: "acc" })).toBe("topu");
    expect(noun("saç", { case: "acc" })).toBe("saçı");
    expect(noun("süt", { case: "acc" })).toBe("sütü");
    expect(noun("saat", { case: "acc" })).toBe("saati");
    expect(noun("top", { case: "dat" })).toBe("topa");
  });
  it("does not soften before consonant-initial suffixes", () => {
    expect(noun("kitap", { plural: true })).toBe("kitaplar");
    expect(noun("kitap", { case: "ins" })).toBe("kitapla");
    expect(noun("çocuk", { case: "loc" })).toBe("çocukta");
  });
});

describe("rule 5 — buffer letters y / s / n", () => {
  it("y for dative & accusative", () => {
    expect(noun("araba", { case: "dat" })).toBe("arabaya");
    expect(noun("araba", { case: "acc" })).toBe("arabayı");
    expect(noun("kedi", { case: "dat" })).toBe("kediye");
    expect(noun("oda", { case: "acc" })).toBe("odayı");
    expect(noun("ütü", { case: "acc" })).toBe("ütüyü");
  });
  it("s for 3rd-person possessive", () => {
    expect(noun("araba", { possessive: "3sg" })).toBe("arabası");
    expect(noun("kedi", { possessive: "3sg" })).toBe("kedisi");
    expect(noun("oda", { possessive: "3sg" })).toBe("odası");
    expect(noun("ütü", { possessive: "3sg" })).toBe("ütüsü");
    expect(noun("masa", { possessive: "3sg" })).toBe("masası");
  });
  it("n for genitive", () => {
    expect(noun("araba", { case: "gen" })).toBe("arabanın");
    expect(noun("kedi", { case: "gen" })).toBe("kedinin");
    expect(noun("oda", { case: "gen" })).toBe("odanın");
    expect(noun("ütü", { case: "gen" })).toBe("ütünün");
    expect(noun("Ali", { case: "gen" })).toBe("Ali'nin");
  });
  it("su takes y everywhere", () => {
    expect(noun("su", { case: "acc" })).toBe("suyu");
    expect(noun("su", { case: "gen" })).toBe("suyun");
    expect(noun("su", { possessive: "3sg" })).toBe("suyu");
    expect(noun("su", { possessive: "1sg" })).toBe("suyum");
    expect(noun("su", { plural: true })).toBe("sular");
  });
});

describe("rule 6 — harmony exceptions (loanwords)", () => {
  it.each([
    ["saat", { plural: true }, "saatler"],
    ["saat", { case: "dat" }, "saate"],
    ["saat", { case: "gen" }, "saatin"],
    ["kalp", { case: "acc" }, "kalbi"],
    ["gol", { case: "acc" }, "golü"],
    ["gol", { plural: true }, "goller"],
    ["saat", { possessive: "1sg" }, "saatim"],
  ] as const)("%s → %s", (w, spec, f) => expect(noun(w, spec)).toBe(f));
});

describe("vowel drop & doubling", () => {
  it.each([
    ["şehir", { possessive: "3sg" }, "şehri"],
    ["şehir", { case: "dat" }, "şehre"],
    ["burun", { possessive: "1sg" }, "burnum"],
    ["hak", { possessive: "3sg" }, "hakkı"],
    ["şehir", { plural: true }, "şehirler"],
  ] as const)("%s → %s", (w, spec, f) => expect(noun(w, spec)).toBe(f));
});

describe("dative -(y)A (step 4)", () => {
  it.each([
    ["ev", "eve"],
    ["okul", "okula"],
    ["araba", "arabaya"],
    ["kitap", "kitaba"],
    ["göz", "göze"],
    ["Ali", "Ali'ye"],
    ["Mehmet", "Mehmet'e"],
  ])("%s → %s", (w, f) => expect(noun(w, { case: "dat" })).toBe(f));
});

describe("accusative -(y)I (step 5)", () => {
  it.each([
    ["ev", "evi"],
    ["kitap", "kitabı"],
    ["araba", "arabayı"],
    ["okul", "okulu"],
    ["göz", "gözü"],
    ["çocuk", "çocuğu"],
  ])("%s → %s", (w, f) => expect(noun(w, { case: "acc" })).toBe(f));
});

describe("possessive (step 6)", () => {
  it("ev: evim, evin, evi, evimiz, eviniz, evleri", () => {
    expect(noun("ev", { possessive: "1sg" })).toBe("evim");
    expect(noun("ev", { possessive: "2sg" })).toBe("evin");
    expect(noun("ev", { possessive: "3sg" })).toBe("evi");
    expect(noun("ev", { possessive: "1pl" })).toBe("evimiz");
    expect(noun("ev", { possessive: "2pl" })).toBe("eviniz");
    expect(noun("ev", { possessive: "3pl" })).toBe("evleri");
  });
  it("araba: arabam, araban, arabası, arabamız, arabanız, arabaları", () => {
    expect(noun("araba", { possessive: "1sg" })).toBe("arabam");
    expect(noun("araba", { possessive: "2sg" })).toBe("araban");
    expect(noun("araba", { possessive: "3sg" })).toBe("arabası");
    expect(noun("araba", { possessive: "1pl" })).toBe("arabamız");
    expect(noun("araba", { possessive: "2pl" })).toBe("arabanız");
    expect(noun("araba", { possessive: "3pl" })).toBe("arabaları");
  });
  it("softening & harmony in possessives", () => {
    expect(noun("kitap", { possessive: "1sg" })).toBe("kitabım");
    expect(noun("çocuk", { possessive: "1pl" })).toBe("çocuğumuz");
    expect(noun("göz", { possessive: "2pl" })).toBe("gözünüz");
    expect(noun("okul", { possessive: "3sg" })).toBe("okulu");
    expect(noun("saat", { possessive: "2sg" })).toBe("saatin");
  });
  it("3rd-person possessive + case uses pronominal n", () => {
    expect(noun("ev", { possessive: "3sg", case: "loc" })).toBe("evinde");
    expect(noun("ev", { possessive: "3sg", case: "dat" })).toBe("evine");
    expect(noun("araba", { possessive: "3sg", case: "acc" })).toBe("arabasını");
    expect(noun("kitap", { possessive: "3sg", case: "abl" })).toBe("kitabından");
    expect(noun("araba", { possessive: "3sg", case: "gen" })).toBe("arabasının");
  });
});

describe("genitive -(n)In + compounds (step 7)", () => {
  it.each([
    ["ev", "evin"],
    ["araba", "arabanın"],
    ["kitap", "kitabın"],
    ["okul", "okulun"],
    ["göz", "gözün"],
    ["Ali", "Ali'nin"],
  ])("%s → %s", (w, f) => expect(noun(w, { case: "gen" })).toBe(f));
  it("Ali'nin arabası", () => {
    expect(possessiveCompound(N.Ali, N.araba).form).toBe("Ali'nin arabası");
    expect(possessiveCompound(N.çocuk, N.kitap).form).toBe("çocuğun kitabı");
    expect(possessiveCompound(N.kedi, N.göz).form).toBe("kedinin gözü");
    expect(possessiveCompound(N.Mehmet, N.ev).form).toBe("Mehmet'in evi");
    expect(possessiveCompound(N.okul, N.oda).form).toBe("okulun odası");
  });
});

describe("copula / to be (step 8)", () => {
  it("öğrenci", () => {
    const f = (p: Parameters<typeof copula>[1]) => copula("öğrenci", p).form;
    expect(f("1sg")).toBe("öğrenciyim");
    expect(f("2sg")).toBe("öğrencisin");
    expect(f("3sg")).toBe("öğrenci");
    expect(f("1pl")).toBe("öğrenciyiz");
    expect(f("2pl")).toBe("öğrencisiniz");
    expect(f("3pl")).toBe("öğrenciler");
  });
  it.each([
    ["yorgun", "2sg", "yorgunsun"],
    ["yorgun", "1sg", "yorgunum"],
    ["evde", "1pl", "evdeyiz"],
    ["evde", "1sg", "evdeyim"],
    ["Türk", "1sg", "Türküm"],
    ["mutlu", "1pl", "mutluyuz"],
    ["doktor", "2pl", "doktorsunuz"],
  ] as const)("%s + %s → %s", (w, p, f) => expect(copula(w, p).form).toBe(f));
  it("softens with a flagged noun: çocuğum", () => {
    expect(copula(N.çocuk, "1sg").form).toBe("çocuğum");
  });
  it("negative değil", () => {
    expect(copula("öğrenci", "1sg", { negative: true }).form).toBe("öğrenci değilim");
    expect(copula("yorgun", "2sg", { negative: true }).form).toBe("yorgun değilsin");
    expect(copula("evde", "3sg", { negative: true }).form).toBe("evde değil");
    expect(copula("hasta", "1pl", { negative: true }).form).toBe("hasta değiliz");
    expect(copula("hasta", "3pl", { negative: true }).form).toBe("hasta değiller");
  });
  it("past -(y)DI", () => {
    expect(copula("öğrenci", "1sg", { past: true }).form).toBe("öğrenciydim");
    expect(copula("yorgun", "1sg", { past: true }).form).toBe("yorgundum");
    expect(copula("evde", "1pl", { past: true }).form).toBe("evdeydik");
    expect(copula("kitapta", "3sg", { past: true }).form).toBe("kitaptaydı");
    expect(copula("hasta", "2sg", { past: true }).form).toBe("hastaydın");
  });
});

describe("question particle mI (step 9)", () => {
  it.each([
    ["ev", "mi"],
    ["kitap", "mı"],
    ["okul", "mu"],
    ["göz", "mü"],
    ["geliyor", "mu"],
    ["var", "mı"],
    ["yok", "mu"],
    ["saat", "mi"],
  ])("%s → %s", (w, q) => expect(questionParticle(w, w === "saat" ? "front" : undefined)).toBe(q));
  it("copula questions are written separately with endings on the particle", () => {
    expect(copula("öğrenci", "2sg", { question: true }).form).toBe("öğrenci misin");
    expect(copula("yorgun", "2sg", { question: true }).form).toBe("yorgun musun");
    expect(copula("evde", "1sg", { question: true }).form).toBe("evde miyim");
    expect(copula("hazır", "3pl", { question: true }).form).toBe("hazırlar mı");
    expect(copula("mutlu", "3sg", { question: true }).form).toBe("mutlu mu");
  });
});

const conj = (k: string, t: Parameters<typeof conjugate>[1], p: Parameters<typeof conjugate>[2], o = {}) =>
  conjugate(V[k], t, p, o).form;

describe("present continuous -(I)yor (step 10)", () => {
  it("geliyorum … geliyorlar", () => {
    expect(conj("gel", "present", "1sg")).toBe("geliyorum");
    expect(conj("gel", "present", "2sg")).toBe("geliyorsun");
    expect(conj("gel", "present", "3sg")).toBe("geliyor");
    expect(conj("gel", "present", "1pl")).toBe("geliyoruz");
    expect(conj("gel", "present", "2pl")).toBe("geliyorsunuz");
    expect(conj("gel", "present", "3pl")).toBe("geliyorlar");
  });
  it("vowel-final stems drop the vowel", () => {
    expect(conj("başla", "present", "3sg")).toBe("başlıyor");
    expect(conj("bekle", "present", "3sg")).toBe("bekliyor");
    expect(conj("oku", "present", "3sg")).toBe("okuyor");
    expect(conj("söyle", "present", "1sg")).toBe("söylüyorum");
    expect(conj("uyu", "present", "2sg")).toBe("uyuyorsun");
  });
  it("irregular t → d stems", () => {
    expect(conj("git", "present", "3sg")).toBe("gidiyor");
    expect(conj("et", "present", "3sg")).toBe("ediyor");
    expect(conj("git", "present", "1sg")).toBe("gidiyorum");
    expect(conj("teşekkürEt", "present", "1sg")).toBe("teşekkür ediyorum");
    expect(conj("ye", "present", "3sg")).toBe("yiyor");
    expect(conj("de", "present", "1sg")).toBe("diyorum");
  });
  it("harmony with consonant stems", () => {
    expect(conj("yap", "present", "1sg")).toBe("yapıyorum");
    expect(conj("gör", "present", "1sg")).toBe("görüyorum");
    expect(conj("otur", "present", "1pl")).toBe("oturuyoruz");
    expect(conj("konuş", "present", "2pl")).toBe("konuşuyorsunuz");
    expect(conj("iç", "present", "3pl")).toBe("içiyorlar");
  });
  it("questions: geliyor musun?", () => {
    expect(conj("gel", "present", "2sg", { question: true })).toBe("geliyor musun");
    expect(conj("gel", "present", "1sg", { question: true })).toBe("geliyor muyum");
    expect(conj("gel", "present", "3sg", { question: true })).toBe("geliyor mu");
    expect(conj("gel", "present", "2pl", { question: true })).toBe("geliyor musunuz");
    expect(conj("gel", "present", "3pl", { question: true })).toBe("geliyorlar mı");
  });
});

describe("negative -mA- (step 11)", () => {
  it.each([
    ["gel", "1sg", "gelmiyorum"],
    ["yap", "3sg", "yapmıyor"],
    ["oku", "2sg", "okumuyorsun"],
    ["gör", "1pl", "görmüyoruz"],
    ["git", "1sg", "gitmiyorum"],
    ["başla", "3sg", "başlamıyor"],
    ["ye", "1sg", "yemiyorum"],
  ] as const)("%s %s → %s", (v, p, f) => expect(conj(v, "present", p, { negative: true })).toBe(f));
  it("negative in other tenses", () => {
    expect(conj("gel", "past", "1sg", { negative: true })).toBe("gelmedim");
    expect(conj("yap", "past", "3sg", { negative: true })).toBe("yapmadı");
    expect(conj("gel", "future", "1sg", { negative: true })).toBe("gelmeyeceğim");
    expect(conj("yap", "future", "3pl", { negative: true })).toBe("yapmayacaklar");
    expect(conj("gel", "present", "2sg", { negative: true, question: true })).toBe("gelmiyor musun");
  });
});

describe("past -DI (step 12)", () => {
  it.each([
    ["gel", "1sg", "geldim"],
    ["yap", "1sg", "yaptım"],
    ["git", "1sg", "gittim"],
    ["oku", "2sg", "okudun"],
    ["gör", "3sg", "gördü"],
    ["başla", "1pl", "başladık"],
    ["iç", "2pl", "içtiniz"],
    ["konuş", "3pl", "konuştular"],
    ["et", "1sg", "ettim"],
  ] as const)("%s %s → %s", (v, p, f) => expect(conj(v, "past", p)).toBe(f));
  it("questions: geldin mi?", () => {
    expect(conj("gel", "past", "2sg", { question: true })).toBe("geldin mi");
    expect(conj("yap", "past", "3sg", { question: true })).toBe("yaptı mı");
    expect(conj("oku", "past", "1pl", { question: true })).toBe("okuduk mu");
    expect(conj("gör", "past", "2pl", { question: true })).toBe("gördünüz mü");
    expect(conj("gel", "past", "3pl", { question: true })).toBe("geldiler mi");
  });
});

describe("future -(y)AcAk (step 13)", () => {
  it.each([
    ["gel", "1sg", "geleceğim"],
    ["yap", "1sg", "yapacağım"],
    ["gel", "2sg", "geleceksin"],
    ["gel", "3sg", "gelecek"],
    ["yap", "1pl", "yapacağız"],
    ["gel", "2pl", "geleceksiniz"],
    ["gel", "3pl", "gelecekler"],
    ["başla", "3sg", "başlayacak"],
    ["oku", "1sg", "okuyacağım"],
    ["git", "1sg", "gideceğim"],
    ["et", "3sg", "edecek"],
    ["ye", "1sg", "yiyeceğim"],
    ["de", "3sg", "diyecek"],
  ] as const)("%s %s → %s", (v, p, f) => expect(conj(v, "future", p)).toBe(f));
  it("questions", () => {
    expect(conj("gel", "future", "2sg", { question: true })).toBe("gelecek misin");
    expect(conj("yap", "future", "1sg", { question: true })).toBe("yapacak mıyım");
    expect(conj("gel", "future", "3pl", { question: true })).toBe("gelecekler mi");
    expect(conj("git", "future", "1pl", { question: true })).toBe("gidecek miyiz");
    expect(conj("oku", "future", "3sg", { question: true })).toBe("okuyacak mı");
  });
});

describe("aorist (step 14) — stored per verb", () => {
  it.each([
    ["gel", "1sg", "gelirim"],
    ["git", "1sg", "giderim"],
    ["yap", "2sg", "yaparsın"],
    ["oku", "3sg", "okur"],
    ["başla", "1pl", "başlarız"],
    ["gör", "2pl", "görürsünüz"],
    ["al", "3pl", "alırlar"],
    ["iç", "1sg", "içerim"],
    ["ye", "1sg", "yerim"],
  ] as const)("%s %s → %s", (v, p, f) => expect(conj(v, "aorist", p)).toBe(f));
  it("negative aorist is irregular: gelmem, gelmezsin, gelmeyiz", () => {
    expect(conj("gel", "aorist", "1sg", { negative: true })).toBe("gelmem");
    expect(conj("gel", "aorist", "2sg", { negative: true })).toBe("gelmezsin");
    expect(conj("gel", "aorist", "3sg", { negative: true })).toBe("gelmez");
    expect(conj("yap", "aorist", "1pl", { negative: true })).toBe("yapmayız");
    expect(conj("yap", "aorist", "2pl", { negative: true })).toBe("yapmazsınız");
    expect(conj("iç", "aorist", "3pl", { negative: true })).toBe("içmezler");
  });
  it("questions", () => {
    expect(conj("gel", "aorist", "2sg", { question: true })).toBe("gelir misin");
    expect(conj("iç", "aorist", "1sg", { question: true })).toBe("içer miyim");
    expect(conj("yap", "aorist", "3pl", { question: true })).toBe("yaparlar mı");
    expect(conj("gel", "aorist", "2sg", { question: true, negative: true })).toBe("gelmez misin");
    expect(conj("oku", "aorist", "3sg", { question: true })).toBe("okur mu");
  });
  it("regularAorist predicts the rule incl. the 13 -Ir monosyllables", () => {
    expect(regularAorist("gel")).toBe("gelir");
    expect(regularAorist("yap")).toBe("yapar");
    expect(regularAorist("git", true)).toBe("gider");
    expect(regularAorist("otur")).toBe("oturur");
    expect(regularAorist("başla")).toBe("başlar");
    expect(regularAorist("al")).toBe("alır");
    expect(regularAorist("teşekkür et", true)).toBe("teşekkür eder");
  });
});

describe("abilitative -(y)Abil (step 15)", () => {
  it.each([
    ["gel", "1sg", "gelebilirim"],
    ["yap", "2sg", "yapabilirsin"],
    ["başla", "3sg", "başlayabilir"],
    ["git", "1pl", "gidebiliriz"],
    ["oku", "2pl", "okuyabilirsiniz"],
    ["konuş", "3pl", "konuşabilirler"],
    ["ye", "1sg", "yiyebilirim"],
  ] as const)("%s %s → %s", (v, p, f) => expect(conj(v, "ability", p)).toBe(f));
  it("negative ability: gelemem, gelemezsin", () => {
    expect(conj("gel", "ability", "1sg", { negative: true })).toBe("gelemem");
    expect(conj("gel", "ability", "2sg", { negative: true })).toBe("gelemezsin");
    expect(conj("yap", "ability", "3sg", { negative: true })).toBe("yapamaz");
    expect(conj("git", "ability", "1pl", { negative: true })).toBe("gidemeyiz");
    expect(conj("başla", "ability", "1sg", { negative: true })).toBe("başlayamam");
  });
  it("questions", () => {
    expect(conj("gel", "ability", "1sg", { question: true })).toBe("gelebilir miyim");
    expect(conj("yap", "ability", "2sg", { question: true })).toBe("yapabilir misin");
    expect(conj("konuş", "ability", "3pl", { question: true })).toBe("konuşabilirler mi");
  });
});

describe("stacking plural + possessive + case (step 16)", () => {
  it.each([
    ["ev", { plural: true, possessive: "1sg", case: "abl" }, "evlerimden"],
    ["kitap", { plural: true, possessive: "2pl", case: "loc" }, "kitaplarınızda"],
    ["araba", { plural: true, possessive: "1pl", case: "dat" }, "arabalarımıza"],
    ["çocuk", { plural: true, possessive: "3sg", case: "acc" }, "çocuklarını"],
    ["kitap", { possessive: "1sg", case: "loc" }, "kitabımda"],
    ["ev", { possessive: "2sg", case: "abl" }, "evinden"],
    ["göz", { plural: true, possessive: "1sg", case: "gen" }, "gözlerimin"],
    ["oda", { possessive: "1pl", case: "loc" }, "odamızda"],
  ] as const)("%s → %s", (w, spec, f) => expect(noun(w, spec)).toBe(f));
  it("breakdown parts: evlerimden = ev + ler + im + den", () => {
    expect(inflectNoun(N.ev, { plural: true, possessive: "1sg", case: "abl" }).parts).toEqual(["ev", "ler", "im", "den"]);
    expect(inflectNoun(N.kitap, { case: "acc" }).parts).toEqual(["kitab", "ı"]);
  });
});

describe("applyTemplate", () => {
  it("handles buffers and archiphonemes", () => {
    expect(applyTemplate("araba", "(y)A")).toBe("ya");
    expect(applyTemplate("ev", "(y)A")).toBe("e");
    expect(applyTemplate("kitap", "DAn")).toBe("tan");
    expect(applyTemplate("göz", "lArI")).toBe("leri");
    expect(applyTemplate("saat", "lAr", "front")).toBe("ler");
  });
});
