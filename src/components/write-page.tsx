"use client";

import { useState } from "react";
import type { WritingRow } from "@/lib/db/writing";
import { CorrectionView } from "./correction-view";
import { WritingBox } from "./writing-box";

interface Prompt {
  prompt: string;
  promptTr?: string;
  hints?: string[];
  fromLesson?: boolean;
}

export function WritePage({ prompts, lessonDate, history }: { prompts: Prompt[]; lessonDate?: string; history: WritingRow[] }) {
  const [i, setI] = useState(0);
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const p = i === -1 ? { prompt: custom || "Free writing", hints: [] } : prompts[i];

  return (
    <div className="space-y-5">
      <section className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {prompts.map((x, k) => (
            <button key={k} onClick={() => setI(k)} className={`rounded-full px-3 py-1.5 text-sm ${k === i ? "bg-fg text-bg" : "bg-card-2"}`}>
              {x.fromLesson ? "📖 Today's task" : `Prompt ${k + (prompts[0]?.fromLesson ? 0 : 1)}`}
            </button>
          ))}
          <button onClick={() => setI(-1)} className={`rounded-full px-3 py-1.5 text-sm ${i === -1 ? "bg-fg text-bg" : "bg-card-2"}`}>
            ✏️ My own topic
          </button>
        </div>
        {i === -1 ? (
          <input className="input !text-base" placeholder="What do you want to write about? (in English)" value={custom} onChange={(e) => setCustom(e.target.value)} />
        ) : null}
        <WritingBox key={`${i}-${p.prompt}`} prompt={p.prompt} promptTr={"promptTr" in p ? p.promptTr : undefined} hints={p.hints ?? []} lessonDate={"fromLesson" in p && p.fromLesson ? lessonDate : undefined} />
      </section>

      {history.length ? (
        <section className="card">
          <h2 className="mb-2 font-semibold">
            Past writing <span className="label-tr">· Geçmiş yazılar</span>
          </h2>
          <ul className="divide-y divide-border">
            {history.map((w) => (
              <li key={w.id} className="py-2">
                <button className="flex w-full items-center justify-between gap-2 text-left text-sm" onClick={() => setOpen(open === w.id ? null : w.id)}>
                  <span className="min-w-0 truncate">
                    <span className="text-muted">{w.date}</span> · {w.prompt}
                  </span>
                  <span className="shrink-0">{w.score !== null ? `${w.score}/10` : w.attempts >= 3 ? "correction failed" : "⏳ waiting for correction"}</span>
                </button>
                {open === w.id ? (
                  <div className="mt-3">
                    {w.corrected ? <CorrectionView mine={w.myText} correction={w.corrected} /> : <p className="text-sm whitespace-pre-wrap">{w.myText}</p>}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
