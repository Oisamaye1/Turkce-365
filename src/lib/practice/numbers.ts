/** Numbers and clock times in Turkish words. Pure; used by the practice games. */
const ONES = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];

/** 0–999 999 in words: 1984 → "bin dokuz yüz seksen dört". */
export function numberToTurkish(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new Error(`Out of range: ${n}`);
  if (n === 0) return ONES[0];
  const out: string[] = [];
  const thousands = Math.floor(n / 1000);
  if (thousands) {
    if (thousands > 1) out.push(numberToTurkish(thousands));
    out.push("bin"); // "bin", never "bir bin"
  }
  const rest = n % 1000;
  const h = Math.floor(rest / 100);
  if (h) {
    if (h > 1) out.push(ONES[h]);
    out.push("yüz"); // "yüz", never "bir yüz"
  }
  const t = Math.floor((rest % 100) / 10);
  const o = rest % 10;
  if (t) out.push(TENS[t]);
  if (o) out.push(ONES[o]);
  return out.join(" ");
}

/** "the hour" as an object (üçü) and as a destination (dörde), 1–12. */
const HOUR_ACC: Record<number, string> = { 1: "biri", 2: "ikiyi", 3: "üçü", 4: "dördü", 5: "beşi", 6: "altıyı", 7: "yediyi", 8: "sekizi", 9: "dokuzu", 10: "onu", 11: "on biri", 12: "on ikiyi" };
const HOUR_DAT: Record<number, string> = { 1: "bire", 2: "ikiye", 3: "üçe", 4: "dörde", 5: "beşe", 6: "altıya", 7: "yediye", 8: "sekize", 9: "dokuza", 10: "ona", 11: "on bire", 12: "on ikiye" };

/**
 * Everyday spoken time, 12-hour: 3:00 "Saat üç.", 3:30 "Saat üç buçuk.",
 * 3:15 "Saat üçü çeyrek geçiyor.", 3:20 "Saat üçü yirmi geçiyor.",
 * 3:45 "Saat dörde çeyrek var.", 3:50 "Saat dörde on var."
 */
export function timeToTurkish(hour: number, minute: number): string {
  const h = ((hour + 11) % 12) + 1;
  if (minute === 0) return `Saat ${numberToTurkish(h)}.`;
  if (minute === 30) return `Saat ${numberToTurkish(h)} buçuk.`;
  if (minute < 30) return `Saat ${HOUR_ACC[h]} ${minute === 15 ? "çeyrek" : numberToTurkish(minute)} geçiyor.`;
  const next = (h % 12) + 1;
  const left = 60 - minute;
  return `Saat ${HOUR_DAT[next]} ${left === 15 ? "çeyrek" : numberToTurkish(left)} var.`;
}
