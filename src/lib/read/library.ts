/** Everything readable: graded stories plus the lesson dialogues as "conversations". */
import dialoguesJson from "../../../data/dialogues.json";
import { STORIES, type Story } from "./stories";

interface DialogueJson {
  id: string;
  minStep: number;
  title: string;
  titleTr: string;
  setting: string;
  lines: { speaker: string; tr: string; en: string }[];
}

export interface ReadItem {
  id: string;
  kind: "story" | "conversation";
  title: string;
  titleTr: string;
  level: string;
  blurb: string;
  lines: { speaker?: string; tr: string; en: string }[];
  questions: Story["questions"];
}

const levelForStep = (s: number) => (s <= 4 ? "A1" : s <= 10 ? "A1+" : "A2");

export const LIBRARY: ReadItem[] = [
  ...STORIES.map((s) => ({ id: s.id, kind: "story" as const, title: s.title, titleTr: s.titleTr, level: s.level, blurb: s.blurb, lines: s.lines.map(([tr, en]) => ({ tr, en })), questions: s.questions })),
  ...(dialoguesJson as DialogueJson[]).map((d) => ({
    id: `dlg-${d.id}`,
    kind: "conversation" as const,
    title: d.title,
    titleTr: d.titleTr,
    level: levelForStep(d.minStep),
    blurb: d.setting,
    lines: d.lines,
    questions: [],
  })),
];

export const READ_BY_ID = new Map(LIBRARY.map((x) => [x.id, x]));
