"use client";

import { useState } from "react";
import { updateMissionAction } from "@/app/actions";
import type { MissionRow } from "@/lib/db/missions";
import { Speak } from "./speech";

const STATUS = {
  active: { label: "To do", cls: "bg-accent-tint text-accent-text" },
  done: { label: "Done", cls: "bg-ok-tint text-ok-text" },
  struggled: { label: "Tried it", cls: "bg-warn-tint text-warn-text" },
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
    setSaved(s === "done" ? "Marked as done." : s === "struggled" ? "Saved. These phrases will come back in your lessons." : "Saved.");
  };

  if (!current && !open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-4 border-b border-line py-3.5 text-left hover:bg-haze">
        <span className="w-16 shrink-0 text-[13px] text-muted tabular">Week {row.learnerWeek}</span>
        <span className="min-w-0 flex-1 truncate text-[15px]">{m.title}</span>
        <span className={`pill ${STATUS[status].cls}`}>{STATUS[status].label}</span>
      </button>
    );
  }

  return (
    <article className={current ? "" : "border-b border-line py-8"}>
      <div className="flex flex-wrap items-center gap-3 text-[14px] text-muted">
        <span className="tabular">
          Week {row.learnerWeek}
          {m.round ? `, round ${m.round}` : ""}
        </span>
        <span className={`pill ${STATUS[status].cls}`}>{STATUS[status].label}</span>
      </div>
      <h2 className="font-display mt-2 text-[33px] leading-tight font-semibold sm:text-[42px]">{m.title}</h2>
      <p className="text-ink-soft" lang="tr">
        {m.titleTr}
      </p>
      <p className="mt-5 max-w-[60ch] text-[19px] leading-relaxed">{m.goal}</p>
      <p className="mt-2 text-[15px] text-muted">Where: {m.place}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <h3 className="font-display text-[21px] font-semibold">Phrases to take with you</h3>
          <ol className="mt-3 border-t border-line">
            {m.phrases.map((p) => (
              <li key={p.tr} className="flex items-center gap-4 border-b border-line py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="tr-word text-[24px] leading-tight" lang="tr">
                    {p.tr}
                  </p>
                  <p className="text-[15px] text-ink-soft">{p.en}</p>
                </div>
                <Speak text={p.tr} size="sm" />
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-[60ch] text-[15px] text-ink-soft">{m.tips}</p>
        </section>

        <section>
          <label htmlFor={`refl-${row.week}`} className="font-display text-[21px] font-semibold">
            How did it go?
          </label>
          <textarea
            id={`refl-${row.week}`}
            className="input mt-3 min-h-28 !text-[15px]"
            placeholder="What did you say? What was hard? Anything you didn't understand?"
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value);
              setSaved(null);
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => save("done")}>
              I did it
            </button>
            <button className="btn-secondary" onClick={() => save("struggled")}>
              I tried, it was hard
            </button>
          </div>
          {saved ? (
            <p className="mt-3 text-[14px] text-ok-text" role="status">
              {saved}
            </p>
          ) : null}
        </section>
      </div>
    </article>
  );
}
