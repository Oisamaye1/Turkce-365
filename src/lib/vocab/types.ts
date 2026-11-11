/** Shape of one entry in data/vocab.json (the seed deck). */
export interface VocabEntry {
  tr: string;
  en: string;
  pos: PartOfSpeech;
  unit: number;
  exTr?: string;
  exEn?: string;
  note?: string;
  /** Nouns/adjectives ending in p, ç, t, k: does the final consonant soften before a vowel? */
  softens?: boolean;
  harmonyOverride?: "front" | "back";
  dropsVowel?: boolean;
  doubles?: boolean;
  yBuffer?: boolean;
  /** Multi-word or compound noun ending in a possessive (Türk kahvesi, buzdolabı): inflects with n. */
  compound?: boolean;
  /** Excluded from auto-generated suffix drills (behaviour not certain enough to drill). */
  noDrill?: boolean;
  /** Verbs: stem without -mAk. */
  stem?: string;
  /** Verbs: 3rd person singular aorist, e.g. "gelir". */
  aorist?: string;
  /** Verbs: description of an irregularity, e.g. "git → gid- before vowels". */
  irregular?: string;
}

export type PartOfSpeech =
  | "noun"
  | "proper"
  | "verb"
  | "adj"
  | "adv"
  | "pron"
  | "phrase"
  | "num"
  | "postp"
  | "conj"
  | "question"
  | "particle"
  | "interj";

export interface UnitInfo {
  unit: number;
  title: string;
  titleTr: string;
}
