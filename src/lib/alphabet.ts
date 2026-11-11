/** The 29 letters of the Turkish alphabet, with sounds and examples (Module A). */
export interface Letter {
  upper: string;
  lower: string;
  name: string;
  sound: string;
  example: string;
  exampleEn: string;
  /** Differs from English — gets extra focus. */
  special?: boolean;
  tip?: string;
}

export const ALPHABET: Letter[] = [
  { upper: "A", lower: "a", name: "a", sound: "a as in 'father'", example: "araba", exampleEn: "car" },
  { upper: "B", lower: "b", name: "be", sound: "b as in 'bed'", example: "balık", exampleEn: "fish" },
  { upper: "C", lower: "c", name: "ce", sound: "j as in 'jam'", example: "cami", exampleEn: "mosque", special: true, tip: "Never 'k' or 's': cami = 'jah-mee'." },
  { upper: "Ç", lower: "ç", name: "çe", sound: "ch as in 'church'", example: "çay", exampleEn: "tea", special: true, tip: "Çay sounds like 'chai'." },
  { upper: "D", lower: "d", name: "de", sound: "d as in 'dog'", example: "deniz", exampleEn: "sea" },
  { upper: "E", lower: "e", name: "e", sound: "e as in 'bed'", example: "ev", exampleEn: "house" },
  { upper: "F", lower: "f", name: "fe", sound: "f as in 'fun'", example: "fırın", exampleEn: "bakery" },
  { upper: "G", lower: "g", name: "ge", sound: "g as in 'go' (always hard)", example: "gün", exampleEn: "day" },
  { upper: "Ğ", lower: "ğ", name: "yumuşak ge", sound: "silent — lengthens the vowel before it", example: "dağ", exampleEn: "mountain", special: true, tip: "'Soft g' never starts a word. dağ ≈ 'daa', öğretmen ≈ 'öö-ret-men'." },
  { upper: "H", lower: "h", name: "he", sound: "h as in 'hat' (always pronounced)", example: "hava", exampleEn: "weather / air" },
  { upper: "I", lower: "ı", name: "ı", sound: "like the 'e' in 'taken' or 'a' in 'sofa'", example: "ılık", exampleEn: "lukewarm", special: true, tip: "Undotted ı — a short, unrounded 'uh'. Capital I has no dot." },
  { upper: "İ", lower: "i", name: "i", sound: "ee as in 'see' (short)", example: "iyi", exampleEn: "good", special: true, tip: "Dotted i keeps its dot as a capital: İstanbul, İskele." },
  { upper: "J", lower: "j", name: "je", sound: "s as in 'measure'", example: "plaj", exampleEn: "beach", special: true, tip: "Rare, mostly in loanwords: plaj, garaj." },
  { upper: "K", lower: "k", name: "ke", sound: "k as in 'kite'", example: "kahve", exampleEn: "coffee" },
  { upper: "L", lower: "l", name: "le", sound: "l as in 'love'", example: "limon", exampleEn: "lemon" },
  { upper: "M", lower: "m", name: "me", sound: "m as in 'man'", example: "masa", exampleEn: "table" },
  { upper: "N", lower: "n", name: "ne", sound: "n as in 'no'", example: "nar", exampleEn: "pomegranate" },
  { upper: "O", lower: "o", name: "o", sound: "o as in 'more' (short)", example: "okul", exampleEn: "school" },
  { upper: "Ö", lower: "ö", name: "ö", sound: "like 'u' in 'fur' with rounded lips (German ö)", example: "öğrenci", exampleEn: "student", special: true, tip: "Say 'e' and round your lips." },
  { upper: "P", lower: "p", name: "pe", sound: "p as in 'pen'", example: "pazar", exampleEn: "market / Sunday" },
  { upper: "R", lower: "r", name: "re", sound: "tapped r (like Spanish)", example: "renk", exampleEn: "colour", tip: "At the end of a word it's soft, almost whispered: 'bir'." },
  { upper: "S", lower: "s", name: "se", sound: "s as in 'sun' (never z)", example: "su", exampleEn: "water" },
  { upper: "Ş", lower: "ş", name: "şe", sound: "sh as in 'shop'", example: "şeker", exampleEn: "sugar", special: true, tip: "Teşekkür = 'te-shek-kür'." },
  { upper: "T", lower: "t", name: "te", sound: "t as in 'top'", example: "taksi", exampleEn: "taxi" },
  { upper: "U", lower: "u", name: "u", sound: "oo as in 'food' (short)", example: "uçak", exampleEn: "plane" },
  { upper: "Ü", lower: "ü", name: "ü", sound: "say 'ee' with rounded lips (German ü)", example: "üzüm", exampleEn: "grapes", special: true, tip: "Lips like 'oo', tongue like 'ee'." },
  { upper: "V", lower: "v", name: "ve", sound: "v as in 'van' (soft)", example: "ve", exampleEn: "and" },
  { upper: "Y", lower: "y", name: "ye", sound: "y as in 'yes'", example: "yol", exampleEn: "road" },
  { upper: "Z", lower: "z", name: "ze", sound: "z as in 'zoo'", example: "zeytin", exampleEn: "olive" },
];

/** Listen-and-spell words, chosen to exercise the special letters. `say` is an English-ish respelling. */
export const SPELL_WORDS: { tr: string; en: string; say: string }[] = [
  { tr: "çay", en: "tea", say: "chai" },
  { tr: "çok", en: "very", say: "chok" },
  { tr: "cami", en: "mosque", say: "jah-mee" },
  { tr: "şeker", en: "sugar", say: "sheh-ker" },
  { tr: "şehir", en: "city", say: "sheh-heer" },
  { tr: "güneş", en: "sun", say: "gyoo-nesh" },
  { tr: "dağ", en: "mountain", say: "daa" },
  { tr: "değil", en: "not", say: "dey-eel" },
  { tr: "öğretmen", en: "teacher", say: "ur-ret-men (rounded)" },
  { tr: "ışık", en: "light", say: "uh-shuhk" },
  { tr: "kız", en: "girl", say: "kuhz" },
  { tr: "iyi", en: "good", say: "ee-yee" },
  { tr: "üzüm", en: "grapes", say: "yoo-zyoom (rounded ü)" },
  { tr: "göz", en: "eye", say: "gurz (rounded ö, no r)" },
  { tr: "teşekkür", en: "thanks", say: "teh-shek-kyoor" },
  { tr: "hoşça kal", en: "bye", say: "hosh-cha kahl" },
  { tr: "cevap", en: "answer", say: "jeh-vahp" },
  { tr: "çocuk", en: "child", say: "cho-jook" },
  { tr: "yağmur", en: "rain", say: "yaa-moor" },
  { tr: "ağaç", en: "tree", say: "aa-ahch" },
  { tr: "köprü", en: "bridge", say: "kur-pryoo" },
  { tr: "süt", en: "milk", say: "syoot" },
  { tr: "kahve", en: "coffee", say: "kah-veh" },
  { tr: "otobüs", en: "bus", say: "oh-toh-byoos" },
  { tr: "İskele", en: "Iskele", say: "ees-keh-leh" },
  { tr: "Lefkoşa", en: "Nicosia", say: "lef-koh-shah" },
  { tr: "Girne", en: "Kyrenia", say: "geer-neh" },
  { tr: "hellim", en: "halloumi", say: "hel-leem" },
  { tr: "börek", en: "pastry", say: "bur-rek (rounded ö)" },
  { tr: "eczane", en: "pharmacy", say: "edj-zah-neh" },
  { tr: "müşteri", en: "customer", say: "myoosh-teh-ree" },
  { tr: "sıcak", en: "hot", say: "suh-jahk" },
  { tr: "soğuk", en: "cold", say: "soh-ook" },
  { tr: "pazartesi", en: "Monday", say: "pah-zahr-teh-see" },
  { tr: "çarşamba", en: "Wednesday", say: "char-sham-bah" },
  { tr: "görüşürüz", en: "see you", say: "gur-ryoo-shyoo-ryooz" },
];

export const VOWEL_GROUPS = {
  back: ["a", "ı", "o", "u"],
  front: ["e", "i", "ö", "ü"],
  unrounded: ["a", "e", "ı", "i"],
  rounded: ["o", "ö", "u", "ü"],
};
