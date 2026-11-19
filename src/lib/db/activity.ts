/**
 * Progress in the side activities: best game scores, finished course chapters, stories read.
 * One JSON value in the learner's settings (small, rarely written).
 */
import { getSetting, setSetting } from "./settings";

export interface Activity {
  games: Record<string, { best: number; plays: number; last: string }>;
  learn: Record<string, { done: string; score: number; total: number }>;
  read: Record<string, string>;
}

const EMPTY: Activity = { games: {}, learn: {}, read: {} };

export async function getActivity(): Promise<Activity> {
  const raw = await getSetting("activity");
  if (!raw) return structuredClone(EMPTY);
  try {
    const a = JSON.parse(raw) as Partial<Activity>;
    return { games: a.games ?? {}, learn: a.learn ?? {}, read: a.read ?? {} };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function save(a: Activity) {
  await setSetting("activity", JSON.stringify(a));
}

/** Record a game result; returns whether it's a new best (higher is better). */
export async function recordGame(id: string, score: number): Promise<{ best: number; isBest: boolean }> {
  const a = await getActivity();
  const prev = a.games[id];
  const isBest = !prev || score > prev.best;
  a.games[id] = { best: isBest ? score : prev.best, plays: (prev?.plays ?? 0) + 1, last: new Date().toISOString() };
  await save(a);
  return { best: a.games[id].best, isBest };
}

export async function completeChapter(id: string, score: number, total: number) {
  const a = await getActivity();
  const prev = a.learn[id];
  a.learn[id] = { done: prev?.done ?? new Date().toISOString(), score: Math.max(score, prev?.score ?? 0), total };
  await save(a);
}

export async function markRead(id: string) {
  const a = await getActivity();
  a.read[id] ??= new Date().toISOString();
  await save(a);
}
