/**
 * Turkish phonology primitives used by the suffix engine.
 *
 * Archiphoneme notation (as in grammar books):
 *   A = a/e (2-way harmony)      I = ı/i/u/ü (4-way harmony)
 *   D = d/t (assimilation)       C = c/ç
 *   (y), (n), (s) = buffer letters used only after a vowel.
 */

export const VOWELS = "aeıioöuü";
export const BACK_VOWELS = "aıou";
export const FRONT_VOWELS = "eiöü";
export const ROUNDED_VOWELS = "oöuü";
/** "fıstıkçı şahap" — voiceless consonants that turn a following D into t (and C into ç). */
export const VOICELESS = "fstkçşhp";

export type HarmonyOverride = "front" | "back";

export function isVowel(ch: string | undefined): boolean {
  return !!ch && VOWELS.includes(ch);
}

export function lastChar(word: string): string {
  return word[word.length - 1] ?? "";
}

export function endsWithVowel(word: string): boolean {
  return isVowel(lastChar(word));
}

export function endsWithVoiceless(word: string): boolean {
  return VOICELESS.includes(lastChar(word));
}

/** Last vowel of a word (ignoring circumflexes), optionally re-coloured by a harmony override. */
export function lastVowel(word: string, override?: HarmonyOverride): string {
  const plain = word.replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u");
  for (let i = plain.length - 1; i >= 0; i--) {
    const ch = plain[i];
    if (isVowel(ch)) {
      if (override === "front") return { a: "e", ı: "i", o: "ö", u: "ü" }[ch] ?? ch;
      if (override === "back") return { e: "a", i: "ı", ö: "o", ü: "u" }[ch] ?? ch;
      return ch;
    }
  }
  // No vowel at all (abbreviations etc.) — default to front.
  return "e";
}

/** 2-way harmony: back → a, front → e. */
export function harmonyA(word: string, override?: HarmonyOverride): "a" | "e" {
  return BACK_VOWELS.includes(lastVowel(word, override)) ? "a" : "e";
}

/** 4-way harmony: a,ı → ı | e,i → i | o,u → u | ö,ü → ü. */
export function harmonyI(word: string, override?: HarmonyOverride): "ı" | "i" | "u" | "ü" {
  const v = lastVowel(word, override);
  if (v === "a" || v === "ı") return "ı";
  if (v === "e" || v === "i") return "i";
  if (v === "o" || v === "u") return "u";
  return "ü";
}

/** D → d/t by consonant assimilation. */
export function harmonyD(word: string): "d" | "t" {
  return endsWithVoiceless(word) ? "t" : "d";
}

/** C → c/ç by consonant assimilation (used e.g. by -CI, -CA). */
export function harmonyC(word: string): "c" | "ç" {
  return endsWithVoiceless(word) ? "ç" : "c";
}

/**
 * Consonant softening before a vowel-initial suffix: p→b, ç→c, t→d, k→ğ, but nk→ng.
 * The caller decides *whether* a word softens (stored per word); this only does the swap.
 */
export function soften(word: string): string {
  const last = lastChar(word);
  const stem = word.slice(0, -1);
  switch (last) {
    case "p":
      return stem + "b";
    case "ç":
      return stem + "c";
    case "t":
      return stem + "d";
    case "k":
      return lastChar(stem) === "n" ? stem + "g" : stem + "ğ";
    case "g":
      // Some loanwords end in g (e.g. "psikolog") and soften to ğ.
      return stem + "ğ";
    default:
      return word;
  }
}

/**
 * Expand a suffix template written in archiphonemes against a stem.
 * Supported symbols: A, I, D, C and optional buffer "(y)", "(n)", "(s)".
 * Buffers are kept only when the stem ends with a vowel.
 * Initial vowel-dropping (e.g. "(I)m" after vowels) is expressed with "(I)".
 */
export function applyTemplate(stem: string, template: string, override?: HarmonyOverride): string {
  let out = "";
  const ctx = () => stem + out; // harmony looks at everything produced so far
  // The override re-colours the stem's vowel only until the suffix supplies its own vowel.
  const ov = () => ([...out].some(isVowel) ? undefined : override);
  let i = 0;
  while (i < template.length) {
    const ch = template[i];
    if (ch === "(") {
      const end = template.indexOf(")", i);
      const inner = template.slice(i + 1, end);
      if (endsWithVowel(ctx())) {
        if (inner !== "I" && inner !== "A") out += inner; // buffer consonant kept after vowels
      } else if (inner === "I") {
        out += harmonyI(ctx(), ov());
      } else if (inner === "A") {
        out += harmonyA(ctx(), ov());
      }
      i = end + 1;
      continue;
    }
    if (ch === "A") out += harmonyA(ctx(), ov());
    else if (ch === "I") out += harmonyI(ctx(), ov());
    else if (ch === "D") out += harmonyD(ctx());
    else if (ch === "C") out += harmonyC(ctx());
    else out += ch;
    i++;
  }
  return out;
}
