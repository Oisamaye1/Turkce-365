import { getDb } from "./index";
import { DEFAULT_LESSON_TIME, DEFAULT_TZ, localDate } from "@/lib/time";

export interface Settings {
  newCardsPerDay: number;
  lessonTime: string;
  timezone: string;
  startDate: string;
  voiceURI: string | null;
  claudeModel: string | null;
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

export function getSettings(): Settings {
  const tz = getSetting("timezone") ?? DEFAULT_TZ;
  let start = getSetting("start_date");
  if (!start) {
    start = localDate(new Date(), tz);
    setSetting("start_date", start);
  }
  return {
    newCardsPerDay: Number(getSetting("new_cards_per_day") ?? 15),
    lessonTime: getSetting("lesson_time") ?? DEFAULT_LESSON_TIME,
    timezone: tz,
    startDate: start,
    voiceURI: getSetting("voice_uri"),
    claudeModel: getSetting("claude_model"),
  };
}

export function today(): string {
  return localDate(new Date(), getSettings().timezone);
}
