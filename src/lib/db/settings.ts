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

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.one<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  await db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", [key, value]);
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.all<{ key: string; value: string }>("SELECT key, value FROM settings");
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const tz = m.get("timezone") ?? DEFAULT_TZ;
  let start = m.get("start_date");
  if (!start) {
    start = localDate(new Date(), tz);
    await setSetting("start_date", start);
  }
  return {
    newCardsPerDay: Number(m.get("new_cards_per_day") ?? 15),
    lessonTime: m.get("lesson_time") ?? DEFAULT_LESSON_TIME,
    timezone: tz,
    startDate: start,
    voiceURI: m.get("voice_uri") || null,
    claudeModel: m.get("claude_model") || null,
  };
}

export async function today(): Promise<string> {
  return localDate(new Date(), (await getSettings()).timezone);
}
