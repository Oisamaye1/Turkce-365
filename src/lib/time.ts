/**
 * Date helpers that always work in the learner's timezone.
 * Northern Cyprus follows Turkey time: Europe/Istanbul, UTC+3 all year, no DST.
 * (Not Europe/Nicosia — that's the south and changes for DST.)
 */
export const DEFAULT_TZ = "Europe/Istanbul";
export const DEFAULT_LESSON_TIME = "05:30";

function parts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return o;
}

/** "YYYY-MM-DD" in the given timezone. */
export function localDate(d: Date = new Date(), tz = DEFAULT_TZ): string {
  const p = parts(d, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "HH:MM" (24h) in the given timezone. */
export function localTime(d: Date = new Date(), tz = DEFAULT_TZ): string {
  const p = parts(d, tz);
  const h = p.hour === "24" ? "00" : p.hour;
  return `${h}:${p.minute}`;
}

/** Day of week for a YYYY-MM-DD date: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** Monday of the week containing `date` (weeks run Monday → Sunday). */
export function mondayOf(date: string): string {
  const dow = dayOfWeek(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export const isSunday = (date: string) => dayOfWeek(date) === 0;
export const isMonday = (date: string) => dayOfWeek(date) === 1;

/** Has today's lesson time (e.g. 05:30) passed in the learner's timezone? */
export function isAfterLessonTime(now: Date, lessonTime = DEFAULT_LESSON_TIME, tz = DEFAULT_TZ): boolean {
  return localTime(now, tz) >= lessonTime;
}

/** 1-based learner week number since the start date (week 1 = first 7 days). */
export function learnerWeek(startDate: string, today: string): number {
  return Math.max(1, Math.floor(daysBetween(startDate, today) / 7) + 1);
}

const WEEKDAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayLabel(date: string): { en: string; tr: string } {
  const d = dayOfWeek(date);
  return { en: WEEKDAYS_EN[d], tr: WEEKDAYS_TR[d] };
}

/** UTC offset in minutes of a timezone at a given instant (e.g. +180 for Istanbul). */
export function tzOffsetMinutes(tz: string, at: Date = new Date()): number {
  const p = parts(at, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +(p.hour === "24" ? "0" : p.hour), +p.minute);
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** ISO timestamp (UTC) of local midnight starting `date` in `tz`. */
export function startOfLocalDayIso(date: string, tz = DEFAULT_TZ): string {
  const offset = tzOffsetMinutes(tz, new Date(`${date}T12:00:00Z`));
  return new Date(Date.parse(`${date}T00:00:00Z`) - offset * 60_000).toISOString();
}

/** SQLite modifier that shifts a UTC timestamp into local time, e.g. "+180 minutes". */
export function sqliteTzModifier(tz = DEFAULT_TZ): string {
  const m = tzOffsetMinutes(tz);
  return `${m >= 0 ? "+" : ""}${m} minutes`;
}
