/** One showcase word per grammar step, split into labelled parts (the Today screen's anatomy card). */
export interface Anatomy {
  parts: string[];
  labels: string[];
  en: string;
}

export const STEP_ANATOMY: Record<number, Anatomy> = {
  1: { parts: ["kitap", "lar"], labels: ["book", "plural"], en: "books" },
  2: { parts: ["Lefkoşa", "'da"], labels: ["Nicosia", "in"], en: "in Nicosia" },
  3: { parts: ["Girne", "'den"], labels: ["Kyrenia", "from"], en: "from Kyrenia" },
  4: { parts: ["kitab", "a"], labels: ["book (p → b)", "to"], en: "to the book" },
  5: { parts: ["araba", "y", "ı"], labels: ["car", "buffer", "the (object)"], en: "the car" },
  6: { parts: ["ev", "im"], labels: ["house", "my"], en: "my house" },
  7: { parts: ["Ali", "'nin"], labels: ["Ali", "'s"], en: "Ali's" },
  8: { parts: ["öğrenci", "y", "im"], labels: ["student", "buffer", "I am"], en: "I am a student" },
  9: { parts: ["su", "var", "mı"], labels: ["water", "there is", "?"], en: "is there water?" },
  10: { parts: ["gel", "iyor", "um"], labels: ["come", "-ing", "I"], en: "I am coming" },
  11: { parts: ["gel", "mi", "yor", "um"], labels: ["come", "not", "-ing", "I"], en: "I am not coming" },
  12: { parts: ["git", "ti", "m"], labels: ["go", "past", "I"], en: "I went" },
  13: { parts: ["gid", "eceğ", "im"], labels: ["go", "will", "I"], en: "I will go" },
  14: { parts: ["iç", "er", "im"], labels: ["drink", "usually", "I"], en: "I (usually) drink" },
  15: { parts: ["konuş", "abil", "ir", "im"], labels: ["speak", "can", "aorist", "I"], en: "I can speak" },
  16: { parts: ["ev", "ler", "im", "den"], labels: ["house", "plural", "my", "from"], en: "from my houses" },
  17: { parts: ["otur", "un"], labels: ["sit", "(please)"], en: "please sit down" },
  18: { parts: ["git", "mek", "ist", "iyor", "um"], labels: ["go", "to", "want", "-ing", "I"], en: "I want to go" },
  19: { parts: ["git", "meli", "y", "im"], labels: ["go", "must", "buffer", "I"], en: "I must go" },
  20: { parts: ["gel", "miş"], labels: ["come", "apparently"], en: "apparently he came" },
  21: { parts: ["gel", "ir", "se", "m"], labels: ["come", "aorist", "if", "I"], en: "if I come" },
  22: { parts: ["gel", "iyor", "du", "m"], labels: ["come", "-ing", "was", "I"], en: "I was coming" },
};
