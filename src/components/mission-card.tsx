"use client";

import { useState } from "react";
import { updateMissionAction } from "@/app/actions";
import type { MissionRow } from "@/lib/db/missions";
import { IconTarget } from "./icons";
import { Simit } from "./simit";
import { Speak } from "./speech";

const STATUS = {
  active: { label: "To do", cls: "bg-nar-tint text-nar-depth" },
  done: { label: "Done", cls: "bg-zeytin-tint text-zeytin-depth" },
  struggled: { label: "Tried it", cls: "bg-cay-tint text-cay-depth" },
};

export function MissionCard({ row, current = false }: { row: MissionRow; current?: boolean }) {
  const [status, setStatus] = useState(row.status);
  const [reflection, setReflection] = useState(row.reflection ?? "");
  const [open, setOpen] = useState(current);
  const [saved, setSaved] = useState<string | null>(null);
  const m = row.mission;

  const save = async (s: MissionRow["status"]) => {
    setStatus(s);
    await updateMissionAction(row.week, s, reflection);
    setSaved(s === "done" ? "Marked as done. Harika!" : s === "struggled" ? "Saved. These phrases will come back in your lessons." : "Saved.");
  };

  if (!current && !open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border-2 border-line px-4 py-3 text-left hover:bg-wash">
        <IconTarget size={30} />
        <span className="min-w-0 flex-1">
          <span className="font-display block truncate text-lg font-bold">{m.title}</span>
          <span className="block text-xs text-muted">
            Week {row.learnerWeek}, from {row.week}
          </span>
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[status].cls}`}>{STATUS[status].label}</span>
      </button>
    );
  }

  return (
    <article className={`overflow-hidden rounded-3xl border-2 ${current ? "border-nar/40" : "border-line"}`}>
      <div className={`flex items-start gap-4 p-5 ${current ? "bg-nar-tint" : "bg-wash"}`}>
        <Simit size={84} mood={status === "done" ? "proud" : "calm"} className="hidden shrink-0 sm:block" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">
              Week {row.learnerWeek}
              {m.round ? `, round ${m.round}` : ""}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[status].cls}`}>{STATUS[status].label}</span>
          </div>
          <h2 className="font-display text-2xl leading-tight font-extrabold">{m.title}</h2>
          <p className="text-ink-soft" lang="tr">
            {m.titleTr}
          </p>
          <p className="mt-3 text-lg">{m.goal}</p>
          <p className="mt-1 text-sm text-ink-soft">Where: {m.place}</p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <section>
          <h3 className="font-display mb-2 text-lg font-extrabold">Your phrase sheet</h3>
          <ul className="divide-y-2 divide-line rounded-2xl border-2 border-line">
            {m.phrases.map((p) => (
              <li key={p.tr} className="flex items-center gap-3 px-3 py-2.5">
                <Speak text={p.tr} size="sm" />
                <span className="min-w-0">
                  <span className="font-display block text-lg leading-tight font-bold" lang="tr">
                    {p.tr}
                  </span>
                  <span className="block text-sm text-ink-soft">{p.en}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-ink-soft">Tip: {m.tips}</p>
        </section>

        <section>
          <label htmlFor={`refl-${row.week}`} className="font-display text-lg font-extrabold">
            How did it go?
          </label>
          <textarea
            id={`refl-${row.week}`}
            className="input mt-2 min-h-24 !text-base"
            placeholder="What did you say? What was hard? Anything you didn't understand?"
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value);
              setSaved(null);
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-success" onClick={() => save("done")}>
              I did it
            </button>
            <button className="btn-ghost" onClick={() => save("struggled")}>
              I tried, it was hard
            </button>
          </div>
          {saved ? (
            <p className="mt-2 text-sm font-medium text-zeytin-depth" role="status">
              {saved}
            </p>
          ) : null}
        </section>
      </div>
    </article>
  );
}
