/**
 * The 16-step grammar sequence. Each step unlocks the next at 90 % accuracy over 20 drills.
 * Explanations are ≤ 120 words (checked by tests).
 */
export interface GrammarExample {
  tr: string;
  en: string;
  breakdown?: string;
}

export interface GrammarStep {
  id: number;
  slug: string;
  title: string;
  titleTr: string;
  /** Rule tag used for mistakes & per-rule accuracy. */
  tag: string;
  explanation: string;
  examples: GrammarExample[];
}

export const GRAMMAR_STEPS: GrammarStep[] = [
  {
    id: 1,
    slug: "plural",
    title: "Plural -lAr",
    titleTr: "Çoğul eki",
    tag: "plural",
    explanation:
      "Turkish makes plurals with one suffix: -lar or -ler. Look at the LAST vowel of the word. Back vowels (a, ı, o, u) take -lar; front vowels (e, i, ö, ü) take -ler. This is 2-way vowel harmony and you will use it everywhere. Never add the plural after a number: 'iki kitap' (two books), not 'iki kitaplar'. Loanwords like 'saat' are exceptions and take front endings: saatler.",
    examples: [
      { tr: "evler", en: "houses", breakdown: "ev + ler" },
      { tr: "kitaplar", en: "books", breakdown: "kitap + lar" },
      { tr: "okullar", en: "schools", breakdown: "okul + lar" },
      { tr: "gözler", en: "eyes", breakdown: "göz + ler" },
    ],
  },
  {
    id: 2,
    slug: "locative",
    title: "Locative -DA (in / at / on)",
    titleTr: "Bulunma hâli",
    tag: "locative",
    explanation:
      "-da / -de means in, at or on: evde (at home), okulda (at school). The vowel follows 2-way harmony. The consonant changes too: after the voiceless consonants f, s, t, k, ç, ş, h, p (remember 'fıstıkçı şahap') d becomes t: kitapta, sokakta, Kıbrıs'ta. Proper names keep an apostrophe: Lefkoşa'da, Girne'de.",
    examples: [
      { tr: "evde", en: "at home", breakdown: "ev + de" },
      { tr: "kitapta", en: "in the book", breakdown: "kitap + ta" },
      { tr: "okulda", en: "at school", breakdown: "okul + da" },
      { tr: "Lefkoşa'da", en: "in Nicosia", breakdown: "Lefkoşa + da" },
    ],
  },
  {
    id: 3,
    slug: "ablative",
    title: "Ablative -DAn (from)",
    titleTr: "Ayrılma hâli",
    tag: "ablative",
    explanation:
      "-dan / -den means from or out of: evden (from home), okuldan (from school). It works exactly like the locative, just add n: same 2-way harmony, same d → t after 'fıstıkçı şahap' consonants: kitaptan, Kıbrıs'tan. It is also used for 'than' and with some verbs: 'Köpeklerden korkuyorum' (I'm afraid of dogs).",
    examples: [
      { tr: "evden", en: "from home", breakdown: "ev + den" },
      { tr: "kitaptan", en: "from the book", breakdown: "kitap + tan" },
      { tr: "Girne'den", en: "from Kyrenia", breakdown: "Girne + den" },
      { tr: "okuldan", en: "from school", breakdown: "okul + dan" },
    ],
  },
  {
    id: 4,
    slug: "dative",
    title: "Dative -(y)A (to / towards)",
    titleTr: "Yönelme hâli",
    tag: "dative",
    explanation:
      "-a / -e marks direction: eve (to home), okula (to school). After a vowel, insert the buffer y: arabaya, Girne'ye. Because the suffix starts with a vowel, many multi-syllable words ending in p, ç, t, k soften: kitap → kitaba, çocuk → çocuğa. Short words like top or saç usually don't. The app stores this per word — learn it with the word.",
    examples: [
      { tr: "eve", en: "to home", breakdown: "ev + e" },
      { tr: "okula", en: "to school", breakdown: "okul + a" },
      { tr: "arabaya", en: "to the car", breakdown: "araba + y + a" },
      { tr: "kitaba", en: "to the book", breakdown: "kitab + a (p → b)" },
    ],
  },
  {
    id: 5,
    slug: "accusative",
    title: "Accusative -(y)I (definite object)",
    titleTr: "Belirtme hâli",
    tag: "accusative",
    explanation:
      "When the object of a verb is specific ('the book', 'it', a name), add -ı / -i / -u / -ü. This is 4-way harmony: a, ı → ı; e, i → i; o, u → u; ö, ü → ü. After a vowel use the buffer y: arabayı. Softening applies: kitabı, çocuğu. Indefinite objects stay bare: 'Kitap okuyorum' (I'm reading a book) vs 'Kitabı okuyorum' (I'm reading the book).",
    examples: [
      { tr: "evi", en: "the house (object)", breakdown: "ev + i" },
      { tr: "kitabı", en: "the book (object)", breakdown: "kitab + ı" },
      { tr: "arabayı", en: "the car (object)", breakdown: "araba + y + ı" },
      { tr: "okulu", en: "the school (object)", breakdown: "okul + u" },
    ],
  },
  {
    id: 6,
    slug: "possessive",
    title: "Possessive endings (my, your, his…)",
    titleTr: "İyelik ekleri",
    tag: "possessive",
    explanation:
      "Possession is a suffix: -(I)m my, -(I)n your, -(s)I his/her, -(I)mIz our, -(I)nIz your (pl.), -lArI their. After a consonant the 4-way vowel appears (evim, evin, evi); after a vowel it drops (arabam, araban) and the 3rd person takes s: arabası. Softening applies: kitabım. After his/her/their, case endings add n: evinde, arabasına.",
    examples: [
      { tr: "evim", en: "my house", breakdown: "ev + im" },
      { tr: "arabası", en: "his/her car", breakdown: "araba + s + ı" },
      { tr: "evimiz", en: "our house", breakdown: "ev + imiz" },
      { tr: "kitabın", en: "your book", breakdown: "kitab + ın" },
    ],
  },
  {
    id: 7,
    slug: "genitive",
    title: "Genitive -(n)In + possessive compounds",
    titleTr: "İlgi hâli ve tamlamalar",
    tag: "genitive",
    explanation:
      "The genitive -ın / -in / -un / -ün means 'of' or 's: evin (of the house). After a vowel add n: arabanın. To say 'Ali's car', mark BOTH words: owner + genitive, owned thing + 3rd-person possessive: Ali'nin arabası, öğretmenin kitabı. Pronouns are irregular: benim, senin, onun, bizim, sizin, onların.",
    examples: [
      { tr: "Ali'nin arabası", en: "Ali's car", breakdown: "Ali + nin · araba + sı" },
      { tr: "evin kapısı", en: "the door of the house", breakdown: "ev + in · kapı + sı" },
      { tr: "benim kitabım", en: "my book", breakdown: "ben + im · kitab + ım" },
      { tr: "arabanın", en: "of the car", breakdown: "araba + n + ın" },
    ],
  },
  {
    id: 8,
    slug: "copula",
    title: "'To be' endings",
    titleTr: "Ek-fiil",
    tag: "copula",
    explanation:
      "Turkish has no separate word for 'am / are / is'. Add personal endings to the noun or adjective: -(y)Im I am, -sIn you are, nothing for he/she, -(y)Iz we are, -sInIz you (pl.) are, -lAr they are. After a vowel, y is inserted: öğrenciyim. Softening applies: çocuğum. Negative uses değil + ending: yorgun değilim.",
    examples: [
      { tr: "öğrenciyim", en: "I am a student", breakdown: "öğrenci + y + im" },
      { tr: "yorgunsun", en: "you are tired", breakdown: "yorgun + sun" },
      { tr: "evdeyiz", en: "we are at home", breakdown: "ev + de + y + iz" },
      { tr: "hasta değilim", en: "I am not ill", breakdown: "hasta · değil + im" },
    ],
  },
  {
    id: 9,
    slug: "var-yok-mi",
    title: "var / yok and the question particle mI",
    titleTr: "Var, yok ve soru eki",
    tag: "question-particle",
    explanation:
      "'Var' means there is / exists, 'yok' there isn't. 'Evde su var' = there is water at home. With the possessive they express having: 'Arabam var' (I have a car). Questions use the particle mı / mi / mu / mü, written as a separate word but obeying 4-way harmony: 'Su var mı?' Personal endings attach to the particle: 'Öğrenci misin?'",
    examples: [
      { tr: "su var mı", en: "is there water?", breakdown: "su · var · mı" },
      { tr: "ekmek yok", en: "there's no bread", breakdown: "ekmek · yok" },
      { tr: "yorgun musun", en: "are you tired?", breakdown: "yorgun · mu + sun" },
      { tr: "arabam var", en: "I have a car", breakdown: "araba + m · var" },
    ],
  },
  {
    id: 10,
    slug: "present-continuous",
    title: "Present continuous -(I)yor",
    titleTr: "Şimdiki zaman",
    tag: "present-continuous",
    explanation:
      "-iyor (4-way: -ıyor, -iyor, -uyor, -üyor) means 'am doing' and also general present. Then add endings: -um, -sun, –, -uz, -sunuz, -lar: geliyorum, geliyorsun, geliyor. Stems ending in a vowel drop it: başla → başlıyor, bekle → bekliyor, oku → okuyor. Irregular: git → gidiyor, et → ediyor, de → diyor, ye → yiyor.",
    examples: [
      { tr: "geliyorum", en: "I am coming", breakdown: "gel + iyor + um" },
      { tr: "başlıyor", en: "it is starting", breakdown: "başl + ıyor" },
      { tr: "gidiyoruz", en: "we are going", breakdown: "gid + iyor + uz" },
      { tr: "geliyor musun", en: "are you coming?", breakdown: "gel + iyor · mu + sun" },
    ],
  },
  {
    id: 11,
    slug: "negative",
    title: "Negative -mA-",
    titleTr: "Olumsuzluk eki",
    tag: "negative",
    explanation:
      "Verbs are negated with -ma / -me straight after the stem. Before -yor it narrows to -mı / -mi / -mu / -mü: gelmiyorum (I'm not coming), yapmıyor, okumuyorsun. In other tenses it stays -ma / -me: gelmedim (I didn't come), gelmeyeceğim (I won't come). Nouns and adjectives use değil instead.",
    examples: [
      { tr: "gelmiyorum", en: "I am not coming", breakdown: "gel + mi + yor + um" },
      { tr: "yapmıyor", en: "he isn't doing", breakdown: "yap + mı + yor" },
      { tr: "gelmedim", en: "I didn't come", breakdown: "gel + me + di + m" },
      { tr: "anlamıyorum", en: "I don't understand", breakdown: "anla + mı + yor + um" },
    ],
  },
  {
    id: 12,
    slug: "past",
    title: "Past tense -DI",
    titleTr: "Görülen geçmiş zaman",
    tag: "past-tense",
    explanation:
      "-dı / -di / -du / -dü (4-way harmony) is the past you witnessed. After 'fıstıkçı şahap' consonants it becomes -tı: yaptım, gittim. Endings are short: -m, -n, –, -k, -nIz, -lAr: geldim, geldin, geldi, geldik, geldiniz, geldiler. No softening here: git → gittim. Question: 'Geldin mi?'",
    examples: [
      { tr: "geldim", en: "I came", breakdown: "gel + di + m" },
      { tr: "yaptık", en: "we did", breakdown: "yap + tı + k" },
      { tr: "gittiniz", en: "you (pl.) went", breakdown: "git + ti + niz" },
      { tr: "okudun mu", en: "did you read?", breakdown: "oku + du + n · mu" },
    ],
  },
  {
    id: 13,
    slug: "future",
    title: "Future -(y)AcAk",
    titleTr: "Gelecek zaman",
    tag: "future-tense",
    explanation:
      "-acak / -ecek means 'will'. After a vowel add y: başlayacak, okuyacak. Before a vowel ending, k softens to ğ: geleceğim, yapacağız, but geleceksin. Stems soften too: git → gideceğim, et → edecek. de and ye become diyecek, yiyecek. Negative: gelmeyeceğim. Question: 'Gelecek misin?'",
    examples: [
      { tr: "geleceğim", en: "I will come", breakdown: "gel + eceğ + im" },
      { tr: "yapacağız", en: "we will do", breakdown: "yap + acağ + ız" },
      { tr: "başlayacak", en: "it will start", breakdown: "başla + y + acak" },
      { tr: "gideceksin", en: "you will go", breakdown: "gid + ecek + sin" },
    ],
  },
  {
    id: 14,
    slug: "aorist",
    title: "Aorist (habitual) -Ir / -Ar / -r",
    titleTr: "Geniş zaman",
    tag: "aorist",
    explanation:
      "The aorist expresses habits, general truths, offers and polite requests: 'Kahve içerim' (I drink coffee), 'Yardım eder misiniz?' Vowel stems add -r (okur). One-syllable stems usually take -ar/-er (yapar, içer) but 13 take -ır/-ir (gelir, alır, bilir…). Longer stems take -ır/-ir (çalışır). Learn it with each verb. Negative: gelmem, gelmezsin, gelmez, gelmeyiz.",
    examples: [
      { tr: "gelirim", en: "I (usually) come", breakdown: "gel + ir + im" },
      { tr: "yaparsın", en: "you do", breakdown: "yap + ar + sın" },
      { tr: "okur", en: "he reads", breakdown: "oku + r" },
      { tr: "içmem", en: "I don't drink", breakdown: "iç + me + m" },
    ],
  },
  {
    id: 15,
    slug: "ability",
    title: "Ability -(y)Abil (can)",
    titleTr: "Yeterlilik",
    tag: "abilitative",
    explanation:
      "-abil / -ebil + aorist -ir means 'can': gelebilirim (I can come), yapabilirsin. After a vowel add y: okuyabilir. Stems soften: git → gidebilir. For 'can't', drop bil and use -(y)A + negative: gelemem, gelemezsin, gelemez, gelemeyiz. Polite requests: 'Menüyü alabilir miyim?'",
    examples: [
      { tr: "gelebilirim", en: "I can come", breakdown: "gel + ebil + ir + im" },
      { tr: "okuyabilir", en: "she can read", breakdown: "oku + y + abil + ir" },
      { tr: "gelemem", en: "I can't come", breakdown: "gel + e + me + m" },
      { tr: "alabilir miyim", en: "may I have?", breakdown: "al + abil + ir · mi + y + im" },
    ],
  },
  {
    id: 16,
    slug: "stacking",
    title: "Stacking: plural + possessive + case",
    titleTr: "Ek sıralaması",
    tag: "stacking",
    explanation:
      "Suffixes always come in the same order: ROOT + plural + possessive + case. Each new suffix harmonises with the vowel right before it. ev + ler + im + den = evlerimden (from my houses). kitap + lar + ınız + da = kitaplarınızda (in your books). After his/her/their, add n before the case: evlerinde (in his houses).",
    examples: [
      { tr: "evlerimden", en: "from my houses", breakdown: "ev + ler + im + den" },
      { tr: "kitaplarınızda", en: "in your (pl.) books", breakdown: "kitap + lar + ınız + da" },
      { tr: "arabalarımıza", en: "to our cars", breakdown: "araba + lar + ımız + a" },
      { tr: "evinde", en: "in his house", breakdown: "ev + i + n + de" },
    ],
  },
];

export const STEP_BY_ID = new Map(GRAMMAR_STEPS.map((s) => [s.id, s]));
export const MAX_STEP = GRAMMAR_STEPS.length;
export const UNLOCK_ACCURACY = 0.9;
export const UNLOCK_WINDOW = 20;

export function getStep(id: number): GrammarStep {
  return STEP_BY_ID.get(id) ?? GRAMMAR_STEPS[0];
}
