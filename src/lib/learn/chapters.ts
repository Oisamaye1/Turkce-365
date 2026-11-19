/**
 * "How Turkish works": a short course on how words and sentences are built.
 * Each chapter: a few sections (text, examples with their pieces, tables) and a quiz.
 */
export interface Example {
  tr: string;
  en: string;
  /** "ev + ler + im" — shown as the word's pieces. */
  breakdown?: string;
}

export interface Section {
  heading: string;
  body: string[];
  examples?: Example[];
  table?: { head: string[]; rows: string[][] };
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export interface Chapter {
  id: string;
  title: string;
  titleTr: string;
  summary: string;
  /** Plan week this matches, for "you're here" hints. */
  week: number;
  lab?: "noun" | "verb";
  sections: Section[];
  quiz: QuizQuestion[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: "sounds",
    title: "Sounds and letters",
    titleTr: "Sesler ve harfler",
    summary: "Eight vowels in two families, the hard consonants, and where the stress goes.",
    week: 1,
    sections: [
      {
        heading: "Eight vowels, two families",
        body: [
          "Turkish has eight vowels, and almost every rule in the language depends on which family a vowel belongs to. Back vowels are made at the back of the mouth (a ı o u); front vowels at the front (e i ö ü).",
          "They also split into rounded (lips pushed out: o ö u ü) and unrounded (a e ı i). Learn this little table once: every ending you'll ever add looks it up.",
        ],
        table: {
          head: ["", "unrounded", "rounded"],
          rows: [
            ["back", "a ı", "o u"],
            ["front", "e i", "ö ü"],
          ],
        },
      },
      {
        heading: "The hard consonants",
        body: [
          "Eight consonants are 'hard' (voiceless): f s t k ç ş h p. Turkish teachers remember them with a silly phrase: fıstıkçı şahap (Şahap the pistachio seller). Every hard consonant appears in it.",
          "They matter because endings change after them, and four of them (p ç t k) soften to b c d ğ before a vowel. You'll meet both rules in the chapter on consonant changes.",
        ],
        examples: [
          { tr: "fıstıkçı şahap", en: "a phrase containing every hard consonant" },
          { tr: "kitapta", en: "in the book (d → t after p)", breakdown: "kitap + ta" },
        ],
      },
      {
        heading: "Where the stress goes",
        body: [
          "Most words are stressed on the last syllable: kitAP, gidiyorUM, evlerDE. Adding an ending moves the stress to the new last syllable.",
          "Exceptions to listen for: most place names (İSTanbul, ANkara, LEFkoşa), some adverbs (YArın, Şimdi), and the negative -ma/-me, which takes the stress just before it: GELmiyorum.",
        ],
        examples: [
          { tr: "gidiyorum", en: "I'm going (stress on the last syllable)" },
          { tr: "gelmiyorum", en: "I'm not coming (stress on gel)" },
        ],
      },
    ],
    quiz: [
      { q: "Which group are all front vowels?", options: ["a ı o u", "e i ö ü", "o ö u ü", "a e ı i"], answer: 1, why: "e i ö ü are made at the front of the mouth." },
      { q: "Which letters are rounded vowels?", options: ["a e ı i", "o ö u ü", "a o e ö", "ı i u ü"], answer: 1, why: "o ö u ü are said with rounded lips." },
      { q: "The phrase 'fıstıkçı şahap' helps you remember…", options: ["the eight vowels", "the hard consonants", "the case endings", "the days of the week"], answer: 1, why: "It contains every hard consonant: f s t k ç ş h p." },
      { q: "Where is the stress in 'gelmiyorum'?", options: ["gel", "mi", "yo", "rum"], answer: 0, why: "The negative -mi- pushes the stress onto the syllable before it." },
    ],
  },
  {
    id: "harmony",
    title: "Vowel harmony",
    titleTr: "Ünlü uyumu",
    summary: "Why endings change their vowel, and the two patterns every ending follows.",
    week: 2,
    lab: "noun",
    sections: [
      {
        heading: "Endings copy the last vowel",
        body: [
          "A Turkish ending has no fixed vowel. It looks at the last vowel of the word so far and picks a matching one. That's why 'in' is -da in okulda but -de in evde.",
          "Grammar books write these endings with capital letters: -lAr means -lar or -ler, -DA means -da, -de, -ta or -te. A capital A is a two-way vowel, a capital I a four-way vowel.",
        ],
        examples: [
          { tr: "okulda", en: "at school", breakdown: "okul + da" },
          { tr: "evde", en: "at home", breakdown: "ev + de" },
        ],
      },
      {
        heading: "Two-way harmony: a or e",
        body: ["After a back vowel (a ı o u) the ending takes a; after a front vowel (e i ö ü) it takes e. Plural, 'in', 'from', 'to', the future and the negative all work like this."],
        table: {
          head: ["last vowel", "ending", "example"],
          rows: [
            ["a ı o u", "a", "kitaplar, okuldan"],
            ["e i ö ü", "e", "evler, gözden"],
          ],
        },
      },
      {
        heading: "Four-way harmony: ı, i, u or ü",
        body: ["Endings with a capital I choose by both family and lips: back-unrounded → ı, front-unrounded → i, back-rounded → u, front-rounded → ü. Possessives, the past tense, 'to be' endings and the question word mi work like this."],
        table: {
          head: ["last vowel", "ending", "example"],
          rows: [
            ["a ı", "ı", "kızım, aldım"],
            ["e i", "i", "evim, geldim"],
            ["o u", "u", "okulum, okudum"],
            ["ö ü", "ü", "gözüm, gördüm"],
          ],
        },
        examples: [
          { tr: "evlerimizden", en: "from our houses", breakdown: "ev + ler + imiz + den" },
          { tr: "okullarımızdan", en: "from our schools", breakdown: "okul + lar + ımız + dan" },
        ],
      },
      {
        heading: "A few exceptions",
        body: [
          "Some loanwords, mostly from Arabic and French, take front endings although their last vowel is back: saat → saatler, kalp → kalbim, alkol → alkolü. The dictionary marks them.",
          "A handful of endings never change: -yor (geliyor, okuyor), -ki (bugünkü), -ken (gelirken). Learn them as fixed.",
        ],
      },
    ],
    quiz: [
      { q: "Which is right: 'in the house'?", options: ["evda", "evde", "evta", "evte"], answer: 1, why: "The last vowel is e (front), so -de." },
      { q: "Which is right: 'my book'?", options: ["kitabim", "kitabım", "kitabum", "kitabüm"], answer: 1, why: "The last vowel is a (back, unrounded), so -ım." },
      { q: "Which is right: 'my eye'?", options: ["gözim", "gözım", "gözüm", "gözum"], answer: 2, why: "The last vowel is ö (front, rounded), so -üm." },
      { q: "'saat' (hour, clock) in the plural is…", options: ["saatlar", "saatler", "saatlır", "saatlur"], answer: 1, why: "saat is a loanword that takes front endings." },
    ],
  },
  {
    id: "consonants",
    title: "Consonant changes",
    titleTr: "Ünsüz değişimleri",
    summary: "Softening (kitap → kitabı), hardening (kitapta), dropping and doubling.",
    week: 7,
    lab: "noun",
    sections: [
      {
        heading: "Softening before a vowel",
        body: [
          "When a vowel-initial ending follows, a final p ç t k usually softens: p → b, ç → c, t → d, k → ğ (and nk → ng). It happens in most words of two or more syllables.",
          "Most one-syllable words don't soften (top → topu, saç → saçı, ok → oku), though a few do (dip → dibi, uç → ucu). The app's word list records which is which, so the drills always get it right.",
        ],
        examples: [
          { tr: "kitabım", en: "my book", breakdown: "kitab + ım" },
          { tr: "ağacı", en: "the tree", breakdown: "ağac + ı" },
          { tr: "köpeğe", en: "to the dog", breakdown: "köpeğ + e" },
          { tr: "rengi", en: "its colour", breakdown: "reng + i" },
        ],
      },
      {
        heading: "Hardening after a hard consonant",
        body: [
          "The opposite happens at the start of an ending: after a hard consonant (f s t k ç ş h p), a d becomes t and a c becomes ç. So 'in' is -ta/-te, 'from' is -tan/-ten, the past is -tı/-ti/-tu/-tü.",
          "Listen for it everywhere: dolapta (in the cupboard), yaptım (I did), kitapçı (bookseller).",
        ],
        examples: [
          { tr: "dolapta", en: "in the cupboard", breakdown: "dolap + ta" },
          { tr: "yaptım", en: "I did", breakdown: "yap + tı + m" },
          { tr: "kitapçı", en: "bookseller", breakdown: "kitap + çı" },
        ],
      },
      {
        heading: "Dropped and doubled letters",
        body: [
          "Some two-syllable words lose their last vowel before a vowel ending: ağız → ağzı (his mouth), burun → burnu, şehir → şehri, oğul → oğlu.",
          "A few words from Arabic double their last consonant: hak → hakkı (his right), his → hissi (feeling), ret → reddi.",
        ],
        examples: [
          { tr: "şehrimiz", en: "our city", breakdown: "şehr + imiz" },
          { tr: "hakkın", en: "your right", breakdown: "hakk + ın" },
        ],
      },
    ],
    quiz: [
      { q: "'to the book' is…", options: ["kitapa", "kitaba", "kitapta", "kitaptan"], answer: 1, why: "p softens to b before the vowel of -a." },
      { q: "'in the cupboard (dolap)' is…", options: ["dolapda", "dolabda", "dolapta", "dolabta"], answer: 2, why: "After the hard p, d becomes t; there's no vowel, so no softening." },
      { q: "'his city (şehir)' is…", options: ["şehiri", "şehri", "şehrı", "şehiru"], answer: 1, why: "şehir drops its last vowel before a vowel ending." },
      { q: "Which word does NOT soften?", options: ["kitap → kitabı", "ağaç → ağacı", "top → topu", "köpek → köpeği"], answer: 2, why: "top has one syllable; most one-syllable words keep their consonant." },
    ],
  },
  {
    id: "buffers",
    title: "Buffer letters",
    titleTr: "Kaynaştırma harfleri",
    summary: "Why y, n and s appear between a word and its ending.",
    week: 7,
    lab: "noun",
    sections: [
      {
        heading: "Two vowels never meet: y",
        body: [
          "Turkish doesn't like two vowels side by side. When a word ends in a vowel and the ending starts with one, a y goes between them.",
          "This is why 'to the car' is arabaya and 'I am a student' is öğrenciyim. Grammar books show the buffer in brackets: -(y)A, -(y)I, -(y)Im.",
        ],
        examples: [
          { tr: "arabaya", en: "to the car", breakdown: "araba + ya" },
          { tr: "arabayı", en: "the car (object)", breakdown: "araba + yı" },
          { tr: "öğrenciyim", en: "I'm a student", breakdown: "öğrenci + yim" },
        ],
      },
      {
        heading: "His, her, its: s",
        body: ["The ending for his/her/its is -ı/-i/-u/-ü after a consonant (evi, kitabı) and -sı/-si/-su/-sü after a vowel (arabası, kedisi)."],
        examples: [
          { tr: "evi", en: "his house", breakdown: "ev + i" },
          { tr: "arabası", en: "her car", breakdown: "araba + sı" },
        ],
      },
      {
        heading: "Of, and after his/her: n",
        body: [
          "The genitive ('s, of) is -ın/-in/-un/-ün after a consonant and -nın/-nin/-nun/-nün after a vowel: evin, arabanın.",
          "After his/her/their, an extra n slips in before a case ending: evinde (in his house), arabasından (from her car).",
        ],
        examples: [
          { tr: "arabanın", en: "the car's", breakdown: "araba + nın" },
          { tr: "arabasında", en: "in her car", breakdown: "araba + sı + nda" },
        ],
      },
    ],
    quiz: [
      { q: "'to the garden (bahçe)' is…", options: ["bahçea", "bahçeye", "bahçeya", "bahçede"], answer: 1, why: "Vowel + vowel needs a y; the last vowel e gives -ye." },
      { q: "'her car' is…", options: ["arabaı", "arabayı", "arabası", "arabanı"], answer: 2, why: "his/her after a vowel is -sı." },
      { q: "'in his house' is…", options: ["evide", "evinde", "evisinde", "evde"], answer: 1, why: "ev + i (his) + n (buffer) + de." },
      { q: "'I'm tired (yorgun)' is…", options: ["yorgunum", "yorgunyum", "yorgunım", "yorgunsun"], answer: 0, why: "yorgun ends in a consonant, so no buffer: -um." },
    ],
  },
  {
    id: "nouns",
    title: "Building nouns",
    titleTr: "İsim çekimi",
    summary: "One fixed order: root + plural + whose + case. Then nothing can surprise you.",
    week: 17,
    lab: "noun",
    sections: [
      {
        heading: "The order never changes",
        body: [
          "A noun can carry up to three endings, always in this order: ROOT + plural + possessive (whose) + case (its role). Each ending harmonises with the vowel just before it.",
          "Read long words from the left and they unfold: ev-ler-imiz-den = house, plural, our, from: from our houses.",
        ],
        examples: [
          { tr: "evlerimizden", en: "from our houses", breakdown: "ev + ler + imiz + den" },
          { tr: "kitaplarında", en: "in his books / in their books", breakdown: "kitap + lar + ı + nda" },
          { tr: "arkadaşıma", en: "to my friend", breakdown: "arkadaş + ım + a" },
        ],
      },
      {
        heading: "Whose: the possessive endings",
        body: ["After a vowel the first letter in brackets drops: evim but arabam."],
        table: {
          head: ["whose", "ending", "after a consonant", "after a vowel"],
          rows: [
            ["my", "-(ı)m", "evim", "arabam"],
            ["your", "-(ı)n", "evin", "araban"],
            ["his / her / its", "-(s)ı", "evi", "arabası"],
            ["our", "-(ı)mız", "evimiz", "arabamız"],
            ["your (pl.)", "-(ı)nız", "eviniz", "arabanız"],
            ["their", "-ları", "evleri", "arabaları"],
          ],
        },
      },
      {
        heading: "The role: six case endings",
        body: ["The case ending tells you what the noun is doing in the sentence. With no ending, it's the subject (or an indefinite object)."],
        table: {
          head: ["case", "ending", "meaning", "example"],
          rows: [
            ["accusative", "-(y)ı", "the (definite object)", "evi gördüm"],
            ["dative", "-(y)a", "to, towards", "eve gidiyorum"],
            ["locative", "-da", "in, at, on", "evdeyim"],
            ["ablative", "-dan", "from, out of", "evden çıktım"],
            ["genitive", "-(n)ın", "of, 's", "evin kapısı"],
            ["instrumental", "-(y)la", "with, by", "otobüsle"],
          ],
        },
      },
      {
        heading: "Joining two nouns",
        body: [
          "To join two nouns ('Turkish coffee', 'the city centre'), put -(s)ı on the second: Türk kahvesi, şehir merkezi.",
          "When the first noun is a specific owner, it also takes the genitive: Ali'nin kitabı (Ali's book), evin kapısı (the door of the house).",
        ],
        examples: [
          { tr: "Türk kahvesi", en: "Turkish coffee", breakdown: "Türk · kahve + si" },
          { tr: "Ali'nin kitabı", en: "Ali's book", breakdown: "Ali + 'nin · kitab + ı" },
        ],
      },
    ],
    quiz: [
      { q: "Which order is right?", options: ["ev + den + ler + imiz", "ev + ler + imiz + den", "ev + imiz + ler + den", "ev + ler + den + imiz"], answer: 1, why: "Plural, then possessive, then case." },
      { q: "'to my friends' is…", options: ["arkadaşlarıma", "arkadaşımlara", "arkadaşlarama", "arkadaşalarım"], answer: 0, why: "arkadaş + lar + ım + a." },
      { q: "'Turkish coffee' is…", options: ["Türk kahve", "Türkün kahve", "Türk kahvesi", "Türkçe kahvesi"], answer: 2, why: "Second noun takes -(s)ı: kahvesi." },
      { q: "Which ending means 'from'?", options: ["-(y)a", "-da", "-dan", "-(n)ın"], answer: 2, why: "The ablative -dan/-den/-tan/-ten means from." },
    ],
  },
  {
    id: "verbs",
    title: "Building verbs",
    titleTr: "Fiil çekimi",
    summary: "Stem + not + can + tense + person, and the two sets of person endings.",
    week: 10,
    lab: "verb",
    sections: [
      {
        heading: "From the dictionary to the stem",
        body: ["Dictionary verbs end in -mak or -mek: gelmek (to come), yapmak (to do). Take that off and you have the stem: gel-, yap-. Everything is built on the stem."],
        examples: [
          { tr: "gelmek", en: "to come", breakdown: "gel + mek" },
          { tr: "konuşmak", en: "to speak", breakdown: "konuş + mak" },
        ],
      },
      {
        heading: "The order of a verb",
        body: [
          "A verb's pieces come in a fixed order: STEM + negative (-ma) + ability + tense + person. You won't use all of them at once, but they never swap places.",
          "Watch one verb grow: gel (come) → gelme (don't come) → gelemeyecek (won't be able to come) → gelemeyeceğim (I won't be able to come).",
        ],
        examples: [
          { tr: "geliyorum", en: "I'm coming", breakdown: "gel + iyor + um" },
          { tr: "gelmiyorum", en: "I'm not coming", breakdown: "gel + mi + yor + um" },
          { tr: "gelemeyeceğim", en: "I won't be able to come", breakdown: "gel + e + me + y + eceğ + im" },
        ],
      },
      {
        heading: "Two sets of person endings",
        body: [
          "Most tenses use the same endings as 'to be' (set 1). The past -dı and the 'if' -sa use shorter ones (set 2). Knowing which set a tense uses saves you a lot of memorising.",
        ],
        table: {
          head: ["person", "set 1 (-yor, -acak, aorist, -mış, -malı)", "set 2 (-dı, -sa)"],
          rows: [
            ["I", "geliyorum", "geldim"],
            ["you", "geliyorsun", "geldin"],
            ["he / she", "geliyor", "geldi"],
            ["we", "geliyoruz", "geldik"],
            ["you (pl.)", "geliyorsunuz", "geldiniz"],
            ["they", "geliyorlar", "geldiler"],
          ],
        },
      },
      {
        heading: "Questions stand apart",
        body: ["The question word mi is written separately and harmonises like an ending. With set 1 it carries the person: geliyor musun? With set 2 the person stays on the verb: geldin mi?"],
        examples: [
          { tr: "geliyor musun", en: "are you coming?", breakdown: "gel + iyor · mu + sun" },
          { tr: "geldin mi", en: "did you come?", breakdown: "gel + di + n · mi" },
        ],
      },
    ],
    quiz: [
      { q: "What's the stem of 'okumak' (to read)?", options: ["ok", "oku", "okum", "okuma"], answer: 1, why: "Drop -mak: oku-." },
      { q: "'I didn't come' is…", options: ["gelmedim", "gelmidim", "gelmedi", "gelmeydim"], answer: 0, why: "gel + me (not) + di (past) + m (I)." },
      { q: "Which tense uses the short endings (-m, -n, -k)?", options: ["-yor", "-acak", "-dı", "-mış"], answer: 2, why: "The past -dı and -sa take set 2." },
      { q: "'Are you coming?' is…", options: ["Geliyorsun mu?", "Geliyor musun?", "Gel misin?", "Geliyor mi sun?"], answer: 1, why: "With -yor, the person ending goes on the question word: musun." },
    ],
  },
  {
    id: "sentences",
    title: "Building sentences",
    titleTr: "Cümle yapısı",
    summary: "Verb last, describers first, and the important word right before the verb.",
    week: 12,
    sections: [
      {
        heading: "The verb comes last",
        body: [
          "A plain Turkish sentence is Subject – Object – Verb: Ben çay içiyorum (I tea am-drinking). Everything else fits before the verb, usually time, then place: Yarın Girne'de arkadaşımla kahve içeceğim.",
          "Pronouns are often dropped, because the verb ending already says who: Çay içiyorum is enough.",
        ],
        examples: [
          { tr: "Çay içiyorum.", en: "I'm drinking tea." },
          { tr: "Yarın Girne'de kahve içeceğim.", en: "Tomorrow I'll have coffee in Girne." },
        ],
      },
      {
        heading: "Describers come first",
        body: [
          "Anything that describes a noun goes in front of it: adjectives (kırmızı çanta), owners (Ayşe'nin çantası), even whole clauses (dün aldığım kırmızı çanta, 'the red bag I bought yesterday').",
          "Little words like 'for', 'like', 'until' come after the noun instead of before: senin için (for you), benim gibi (like me), akşama kadar (until the evening).",
        ],
        examples: [
          { tr: "dün aldığım kırmızı çanta", en: "the red bag I bought yesterday" },
          { tr: "senin için", en: "for you" },
        ],
      },
      {
        heading: "The focus sits before the verb",
        body: [
          "Word order is flexible, and it carries meaning: the word right before the verb is the new or important information.",
          "Kahveyi ben yaptım means 'I made the coffee' (it was me); Ben kahveyi yaptım means I made the coffee (not something else).",
        ],
        examples: [
          { tr: "Kahveyi ben yaptım.", en: "It was me who made the coffee." },
          { tr: "Ben kahveyi yaptım.", en: "I made the coffee." },
        ],
      },
    ],
    quiz: [
      { q: "Which is the natural order?", options: ["Ben içiyorum çay.", "İçiyorum ben çay.", "Ben çay içiyorum.", "Çay ben içiyorum içiyorum."], answer: 2, why: "Subject, object, verb." },
      { q: "'for you' is…", options: ["için sen", "senin için", "sana için", "için senin"], answer: 1, why: "için comes after its noun, and pronouns take the genitive: senin için." },
      { q: "In 'Kahveyi ben yaptım', what's stressed?", options: ["kahveyi", "ben", "yaptım", "nothing"], answer: 1, why: "The word right before the verb is the focus." },
      { q: "Where does an adjective go?", options: ["after the noun", "before the noun", "at the end", "anywhere"], answer: 1, why: "Describers always come first: büyük ev." },
    ],
  },
  {
    id: "questions",
    title: "Asking questions",
    titleTr: "Soru sormak",
    summary: "Where to put mi, how it carries the person, and question words.",
    week: 4,
    sections: [
      {
        heading: "mi follows what you ask about",
        body: [
          "For a yes/no question, put mi (mı, mu, mü) right after the word you're asking about. Moving it changes the question.",
          "Ali geldi mi? (Did Ali come?) · Ali mi geldi? (Was it Ali who came?) · Ali bugün mü geldi? (Did Ali come today?)",
        ],
        examples: [
          { tr: "Ali geldi mi?", en: "Did Ali come?" },
          { tr: "Ali mi geldi?", en: "Was it Ali who came?" },
          { tr: "Çay var mı?", en: "Is there tea?" },
        ],
      },
      {
        heading: "mi can carry the person",
        body: ["With 'to be', -yor, -acak and the aorist, the person ending moves onto mi: Öğrenci misin? Geliyor musun? Gelecek misiniz? With the past and -sa, it stays on the verb: Geldin mi?"],
        examples: [
          { tr: "Yorgun musun?", en: "Are you tired?", breakdown: "yorgun · mu + sun" },
          { tr: "Gelecek misin?", en: "Will you come?", breakdown: "gel + ecek · mi + sin" },
        ],
      },
      {
        heading: "Question words stay put",
        body: ["Question words take the place of the answer, usually just before the verb: Nereye gidiyorsun? (Where are you going?) Ne zaman geldin? (When did you come?). Add 'değil mi?' at the end for 'isn't it?'."],
        examples: [
          { tr: "Nereye gidiyorsun?", en: "Where are you going?" },
          { tr: "Güzel, değil mi?", en: "It's nice, isn't it?" },
        ],
      },
    ],
    quiz: [
      { q: "'Are you a student?'", options: ["Öğrenci misin?", "Öğrencisin mi?", "Öğrenci mi?", "Mi öğrencisin?"], answer: 0, why: "With 'to be', the person goes on mi: misin." },
      { q: "'Did you eat?'", options: ["Yedin mi?", "Ye misin?", "Yedi misin?", "Mi yedin?"], answer: 0, why: "With the past, the person stays on the verb: yedin mi." },
      { q: "Which asks 'Was it Ayşe who called?'", options: ["Ayşe aradı mı?", "Ayşe mi aradı?", "Aradı Ayşe mi?", "Mı Ayşe aradı?"], answer: 1, why: "mi goes right after the word in question." },
      { q: "'Is there water?' is…", options: ["Su var mi?", "Su var mı?", "Su mı var?", "Var su mu?"], answer: 1, why: "var has a back vowel, so mı." },
    ],
  },
  {
    id: "making-words",
    title: "Making new words",
    titleTr: "Kelime türetme",
    summary: "A few endings turn one word into many: -lık, -cı, -lı, -sız, -ce, -la.",
    week: 30,
    sections: [
      {
        heading: "From nouns to more nouns",
        body: [
          "-lık/-lik/-luk/-lük makes things, places and ideas: göz (eye) → gözlük (glasses), kitap → kitaplık (bookcase), iyi (good) → iyilik (kindness).",
          "-cı/-ci/-cu/-cü (or -çı after hard consonants) makes the person who does or sells it: kitap → kitapçı (bookseller), süt → sütçü (milkman), yol → yolcu (passenger), iş → işçi (worker).",
        ],
        examples: [
          { tr: "gözlük", en: "glasses", breakdown: "göz + lük" },
          { tr: "kitapçı", en: "bookseller", breakdown: "kitap + çı" },
          { tr: "yolcu", en: "passenger", breakdown: "yol + cu" },
        ],
      },
      {
        heading: "With, without, and languages",
        body: [
          "-lı adds 'with / from' and -sız 'without': şekerli (with sugar), şekersiz (sugar-free), Kıbrıslı (from Cyprus).",
          "-ca/-ce (-ça/-çe after hard consonants) names languages and manners: Türk → Türkçe, İngiliz → İngilizce, yavaş → yavaşça (slowly).",
        ],
        examples: [
          { tr: "şekersiz", en: "without sugar", breakdown: "şeker + siz" },
          { tr: "Türkçe", en: "Turkish (language)", breakdown: "Türk + çe" },
        ],
      },
      {
        heading: "Between verbs and nouns",
        body: [
          "Verbs become nouns with -ma (okuma, reading), -ış (giriş, entrance; çıkış, exit) and -gı (sevgi, love; bilgi, knowledge).",
          "Nouns and adjectives become verbs with -la (temiz → temizlemek, to clean; su → sulamak, to water) and -laş (güzel → güzelleşmek, to get prettier).",
        ],
        examples: [
          { tr: "çıkış", en: "exit", breakdown: "çık + ış" },
          { tr: "temizlemek", en: "to clean", breakdown: "temiz + le + mek" },
        ],
      },
    ],
    quiz: [
      { q: "A 'simitçi' is…", options: ["a kind of simit", "a simit seller", "without simit", "a simit shop sign"], answer: 1, why: "-çi makes the person who sells it." },
      { q: "'tuzsuz' means…", options: ["salty", "without salt", "salt seller", "salt shaker"], answer: 1, why: "-suz means without." },
      { q: "Which means 'entrance'?", options: ["girmek", "giriş", "girişçi", "girli"], answer: 1, why: "gir- + -iş makes a noun: giriş." },
      { q: "'temizlemek' comes from 'temiz' (clean) + …", options: ["-lik", "-le", "-ci", "-li"], answer: 1, why: "-la/-le turns nouns and adjectives into verbs." },
    ],
  },
  {
    id: "linking",
    title: "Linking ideas",
    titleTr: "Cümleleri bağlamak",
    summary: "How Turkish says 'who', 'that', 'when', 'while' and 'and then' with endings.",
    week: 38,
    sections: [
      {
        heading: "'Who' and 'that' are endings",
        body: [
          "Turkish has no separate word for 'who' or 'that' in descriptions. Instead the verb becomes an adjective and goes before the noun.",
          "-(y)an describes the doer: gülen kız (the girl who is laughing), Türkçe konuşan adam (the man who speaks Turkish). -dık + whose describes the object: okuduğum kitap (the book I read), gittiğimiz yer (the place we went).",
        ],
        examples: [
          { tr: "Türkçe konuşan adam", en: "the man who speaks Turkish", breakdown: "konuş + an" },
          { tr: "okuduğum kitap", en: "the book I read", breakdown: "oku + duğ + um" },
          { tr: "gideceğim yer", en: "the place I'll go", breakdown: "gid + eceğ + im" },
        ],
      },
      {
        heading: "When, while, and then",
        body: ["Endings on the first verb link it to the main one. The main verb at the end carries the tense and person for both."],
        table: {
          head: ["ending", "meaning", "example"],
          rows: [
            ["-(y)ıp", "and then", "kalkıp çıktım"],
            ["-(y)ken", "while", "yürürken"],
            ["-(y)ınca", "when, as soon as", "eve gelince"],
            ["-(y)arak", "by, while", "yürüyerek"],
            ["-madan", "without", "sormadan"],
            ["-dıktan sonra", "after", "yedikten sonra"],
            ["-dıkça", "the more", "konuştukça"],
          ],
        },
        examples: [
          { tr: "Eve gelince seni ararım.", en: "I'll call you when I get home." },
          { tr: "Kahvaltı yapmadan çıktım.", en: "I left without having breakfast." },
        ],
      },
      {
        heading: "Saying 'that' after say, know, hear",
        body: ["'I know that you're tired' turns the clause into a noun with -dığı + whose + the object ending: Yorgun olduğunu biliyorum. In speech, people often quote instead: 'Yorgunum' dedi (she said 'I'm tired')."],
        examples: [{ tr: "Geleceğini biliyorum.", en: "I know that you'll come.", breakdown: "gel + eceğ + in + i" }],
      },
    ],
    quiz: [
      { q: "'the woman who is reading' is…", options: ["okuyan kadın", "kadın okuyan", "okuduğum kadın", "okuyor kadın"], answer: 0, why: "-(y)an describes the doer and goes before the noun." },
      { q: "'the film I watched' is…", options: ["izleyen film", "izlediğim film", "film izledim", "izleyeceğim film"], answer: 1, why: "-dık + my: izlediğim." },
      { q: "'-ınca / -ince' means…", options: ["without", "while", "when / as soon as", "the more"], answer: 2, why: "eve gelince: when I get home." },
      { q: "'kalkıp çıktım' means…", options: ["I got up and went out", "I got up while going out", "I went out without getting up", "If I get up I'll go out"], answer: 0, why: "-ıp joins two actions by the same person: and then." },
    ],
  },
];

export const CHAPTER_BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]));
