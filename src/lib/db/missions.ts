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
  learnerWeek: r.learner_week,
  mission: JSON.parse(r.mission_json),
  status: r.status,
  reflection: r.reflection,
  updatedAt: r.updated_at,
});

/** Get (creating if needed) the mission for the week containing `date`. */
export function ensureMission(date: string, override?: Mission): MissionRow {
  const monday = mondayOf(date);
  const existing = getDb().prepare("SELECT * FROM missions WHERE week = ?").get(monday) as Row | undefined;
  if (existing) return toRow(existing);
  const { startDate } = getSettings();
  const lw = learnerWeek(startDate, monday < startDate ? startDate : monday);
  const mission = override ?? missionForWeek(lw);
  getDb()
    .prepare("INSERT INTO missions (week, learner_week, mission_json, status) VALUES (?, ?, ?, 'active')")
    .run(monday, lw, JSON.stringify(mission));
  return toRow(getDb().prepare("SELECT * FROM missions WHERE week = ?").get(monday) as Row);
}

export function getMission(week: string): MissionRow | null {
  const r = getDb().prepare("SELECT * FROM missions WHERE week = ?").get(week) as Row | undefined;
  return r ? toRow(r) : null;
}

export function listMissions(): MissionRow[] {
  return (getDb().prepare("SELECT * FROM missions ORDER BY week DESC").all() as Row[]).map(toRow);
}

export function updateMission(week: string, status: MissionRow["status"], reflection: string | null) {
  getDb()
    .prepare("UPDATE missions SET status = ?, reflection = ?, updated_at = ? WHERE week = ?")
    .run(status, reflection, new Date().toISOString(), week);
}

/** Recent missions the learner struggled with (fed into lesson prompts). */
export function recentStruggles(limit = 3): string[] {
  const rows = getDb()
    .prepare("SELECT * FROM missions WHERE status = 'struggled' ORDER BY week DESC LIMIT ?")
    .all(limit) as Row[];
  return rows.map((r) => {
    const m = toRow(r);
    return `${m.mission.title}${m.reflection ? ` — learner's note: "${m.reflection.slice(0, 200)}"` : ""}`;
  });
}
