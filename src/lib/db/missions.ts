import { getDb } from "./index";
import { getSettings } from "./settings";
import missionsJson from "../../../data/missions.json";
import { learnerWeek, mondayOf } from "@/lib/time";

export interface Mission {
  week: number;
  title: string;
  titleTr: string;
  goal: string;
  place: string;
  phrases: { tr: string; en: string }[];
  tips: string;
  round?: number;
}

export interface MissionRow {
  week: string; // Monday date
  learnerWeek: number;
  mission: Mission;
  status: "active" | "done" | "struggled";
  reflection: string | null;
  updatedAt: string | null;
}

const MISSIONS = missionsJson as Mission[];

/** The mission template for a learner week; after the list runs out it cycles with a harder "round". */
export function missionForWeek(week: number): Mission {
  const idx = (week - 1) % MISSIONS.length;
  const round = Math.floor((week - 1) / MISSIONS.length) + 1;
  const m = MISSIONS[idx];
  if (round === 1) return m;
  return {
    ...m,
    round,
    goal: `${m.goal} Round ${round}: do it without looking at the phrase sheet, and add one extra sentence of your own.`,
  };
}

type Row = { week: string; learner_week: number; mission_json: string; status: MissionRow["status"]; reflection: string | null; updated_at: string | null };
const toRow = (r: Row): MissionRow => ({
  week: r.week,
  learnerWeek: Number(r.learner_week),
  mission: JSON.parse(r.mission_json),
  status: r.status,
  reflection: r.reflection,
  updatedAt: r.updated_at,
});

/** Get (creating if needed) the mission for the week containing `date`. */
export async function ensureMission(date: string, override?: Mission): Promise<MissionRow> {
  const db = await getDb();
  const monday = mondayOf(date);
  const existing = await db.one<Row>("SELECT * FROM missions WHERE week = ?", [monday]);
  if (existing) return toRow(existing);
  const { startDate } = await getSettings();
  const lw = learnerWeek(startDate, monday < startDate ? startDate : monday);
  const mission = override ?? missionForWeek(lw);
  await db.run("INSERT INTO missions (week, learner_week, mission_json, status) VALUES (?, ?, ?, 'active') ON CONFLICT (week) DO NOTHING", [
    monday,
    lw,
    JSON.stringify(mission),
  ]);
  return toRow((await db.one<Row>("SELECT * FROM missions WHERE week = ?", [monday]))!);
}

export async function getMission(week: string): Promise<MissionRow | null> {
  const db = await getDb();
  const r = await db.one<Row>("SELECT * FROM missions WHERE week = ?", [week]);
  return r ? toRow(r) : null;
}

export async function listMissions(): Promise<MissionRow[]> {
  const db = await getDb();
  return (await db.all<Row>("SELECT * FROM missions ORDER BY week DESC")).map(toRow);
}

export async function updateMission(week: string, status: MissionRow["status"], reflection: string | null) {
  const db = await getDb();
  await db.run("UPDATE missions SET status = ?, reflection = ?, updated_at = ? WHERE week = ?", [status, reflection, new Date().toISOString(), week]);
}

/** Recent missions the learner struggled with (fed into lesson prompts). */
export async function recentStruggles(limit = 3): Promise<string[]> {
  const db = await getDb();
  const rows = await db.all<Row>("SELECT * FROM missions WHERE status = 'struggled' ORDER BY week DESC LIMIT ?", [limit]);
  return rows.map((r) => {
    const m = toRow(r);
    return `${m.mission.title}${m.reflection ? ` — learner's note: "${m.reflection.slice(0, 200)}"` : ""}`;
  });
}
