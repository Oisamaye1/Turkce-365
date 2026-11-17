/**
 * Usernames are forgiving: whatever people type is turned into a simple sign-in name.
 * "Ayşe Yılmaz" → "ayse.yilmaz", "ÖMER" → "omer", "me@mail.com" stays as is.
 * Sign-in applies the same conversion, so typing "Ayşe Yılmaz" again works.
 * Pure (no server imports) so the signup form can show the result live.
 */
const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 40;

export function normalizeUsername(u: string): string {
  return u
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (c) => TR[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // other accents: é → e
    .replace(/\s+/g, ".")
    .replace(/\.{2,}/g, ".");
}

/** Problem with an already-normalised username, in words that name the field. */
export function usernameProblem(u: string): string | null {
  if (u.length < USERNAME_MIN) return `Your username needs at least ${USERNAME_MIN} characters.`;
  if (u.length > USERNAME_MAX) return `Your username can be at most ${USERNAME_MAX} characters.`;
  const bad = [...new Set(u.replace(/[a-z0-9._@-]/g, ""))];
  if (bad.length) {
    return `Your username can't contain ${bad.map((c) => `“${c}”`).join(" ")}. Use letters, numbers, dots, dashes, underscores or @.`;
  }
  return null;
}
