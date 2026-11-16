import vocabJson from "../../../data/vocab.json";
import type { PlanDayProps } from "@/components/plan/plan-day";
import { daysCompletedOn } from "@/lib/db/plan";
import { today } from "@/lib/db/settings";
import type { VocabEntry } from "@/lib/vocab/types";
import { PLAN_DAYS, planDay } from "./build";
import { getPlanDayView, type PlanDayView } from "./status";

const VOCAB = vocabJson as VocabEntry[];

export function wordsOfDay(from: number, to: number) {
  return VOCAB.slice(from, to).map((v) => ({ tr: v.tr, en: v.en }));
}

/** Everything the day checklist needs, ready to hand to the client component. */
export async function planDayProps(dayNo?: number): Promise<{ view: PlanDayView; props: PlanDayProps } | null> {
  const view = await getPlanDayView(dayNo);
  if (!view) return null;
  const d = view.day;
  const nextDay = d.day < PLAN_DAYS ? planDay(d.day + 1) : null;
  const finishedToday = (await daysCompletedOn(await today())).length;
  return {
    view,
    props: {
      day: d,
      tasks: view.tasks,
      isCurrent: view.isCurrent,
      completed: !!view.row.completedAt,
      canFinish: view.canFinish,
      words: wordsOfDay(d.words.from, d.words.to),
      next: nextDay ? { day: nextDay.day, title: nextDay.title, weekTitle: nextDay.weekInfo.title } : null,
      finishedToday,
    },
  };
}
