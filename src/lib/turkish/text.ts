/**
 * Turkish-aware text helpers. Pure functions, safe on client and server.
 *
 * Turkish casing differs from English: I ↔ ı and İ ↔ i. Always go through
 * these helpers instead of String#toLowerCase / toUpperCase.
 */

export const TURKISH_SPECIAL_LETTERS = ["ç", "ğ", "ı", "İ", "ö", "ş", "ü"] as const;

/** Lower-case with Turkish rules (I → ı, İ → i), then NFC-normalise. */
export function trLower(s: string): string {
  // Some keyboards produce "İ" as "I" + U+0307 (combining dot above). Fold it first.
  const folded = s.normalize("NFC").replace(/İ/g, "İ");
  return folded.toLocaleLowerCase("tr-TR").normalize("NFC");
}

/** Upper-case with Turkish rules (i → İ, ı → I). */
export function trUpper(s: string): string {
  return s.normalize("NFC").toLocaleUpperCase("tr-TR");
}

/** Capitalise the first letter using Turkish rules ("istanbul" → "İstanbul"). */
export function trCapitalize(s: string): string {
  if (!s) return s;
  return trUpper(s[0]) + s.slice(1);
}

const ASCII_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** Strip Turkish diacritics from an already lower-cased string: "çok" → "cok". */
export function deasciify(s: string): string {
  return s.replace(/[çğıöşüâîû]/g, (c) => ASCII_MAP[c] ?? c);
}

/** Circumflexes (kâğıt, hâlâ) are optional in everyday writing — treat them as plain vowels. */
export function stripCircumflex(s: string): string {
  return s.replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u");
}

/**
 * Normalise a typed answer for comparison: Turkish lower-case, unify apostrophes,
 * collapse whitespace, drop surrounding punctuation.
 */
export function normalizeAnswer(s: string): string {
  return stripCircumflex(trLower(s))
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”"«»]/g, "")
    .replace(/[.,!?;:¿¡…]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein edit distance (insert / delete / substitute). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Split Turkish running text into word tokens (keeps apostrophes inside words: Ali'nin). */
export function tokenizeWords(text: string): string[] {
  return text.match(/[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]+(?:'[A-Za-zÇĞİÖŞÜçğıöşüâîû]+)?/g) ?? [];
}
