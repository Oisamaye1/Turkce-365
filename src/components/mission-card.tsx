"use client";

import { useState } from "react";
import { updateMissionAction } from "@/app/actions";
import type { MissionRow } from "@/lib/db/missions";
import { Speak } from "./speech";
import { Badge } from "./ui";

export function MissionCard({ row, current = false }: { row: MissionRow; current?: boolean }) {
  const [status, setStatus] = useState(row.status);
  const [reflection, setReflection] = useState(row.reflection ?? "");
  const [open, setOpen] = useState(current);
  const [saved, setSaved] = useState(false);
  const m = row.mission;

  const save = async (s: MissionRow["status"]) => {
    setStatus(s);
    await updateMissionAction(row.week, s, reflection);
    setSaved(true);
  };

  return (
    <div className={`card space-y-3 ${current ? "border-accent" : ""}`}>
      <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(!open)}>
        <div>
          <div className="text-xs text-muted">
            Week {row.learnerWeek} · {row.week}
            {m.round ? ` · round ${m.round}` : ""}
          </div>
          <div className="text-lg font-bold">{m.title}</div>
          <div className="text-sm text-muted">{m.titleTr}</div>
        </div>
        <Badge tone={status === "done" ? "good" : status === "struggled" ? "warn" : "accent"}>
          {status === "done" ? "Done ✅" : status === "struggled" ? "Struggled ⚠️" : "Active"}
        </Badge>
      </button>
      {open ? (
        <>
          <p>{m.goal}</p>
          <p className="text-sm text-muted">📍 {m.place}</p>
          <div className="rounded-xl bg-card-2 p-3">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Phrase sheet · İfadeler</div>
            <ul className="space-y-2">
              {m.phrases.map((p) => (
                <li key={p.tr} className="flex items-center gap-2">
                  <Speak text={p.tr} className="!px-1.5 !py-0.5" />
                  <span className="font-semibold">{p.tr}</span>
                  <span className="text-sm text-muted">— {p.en}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm">💡 {m.tips}</p>
          <textarea
            className="input min-h-20 !text-base"
            placeholder="Reflection: how did it go? What was hard? · Nasıl geçti?"
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value);
              setSaved(false);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button className={status === "done" ? "btn-primary" : "btn-ghost"} onClick={() => save("done")}>
              Done ✅
            </button>
            <button className={status === "struggled" ? "btn-primary" : "btn-ghost"} onClick={() => save("struggled")}>
              Tried but struggled ⚠️
            </button>
            {saved ? <span className="text-sm text-good">Saved ✓</span> : null}
          </div>
          {status === "struggled" ? <p className="text-xs text-muted">Struggles are fed into your next lessons so the language comes back.</p> : null}
        </>
      ) : null}
    </div>
  );
}
