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

const SHORT = ["Introduce yourself", "Your morning", "A favourite place", "Invite a colleague", "Last weekend"];

export function WritePage({ prompts, lessonDate, history }: { prompts: Prompt[]; lessonDate?: string; history: WritingRow[] }) {
  const [i, setI] = useState(0);
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const p = i === -1 ? { prompt: custom || "Write about anything you like", hints: [] } : prompts[i];
  const offset = prompts[0]?.fromLesson ? 1 : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0 space-y-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Writing topics">
          {prompts.map((x, k) => (
            <button
              key={k}
              role="tab"
              aria-selected={k === i}
              onClick={() => setI(k)}
              className={`font-display rounded-2xl border-2 px-3.5 py-1.5 font-bold ${k === i ? "border-kobalt bg-kobalt-tint text-kobalt" : "border-line text-ink-soft hover:bg-wash"}`}
            >
              {x.fromLesson ? "Today's task" : SHORT[k - offset] ?? `Topic ${k}`}
            </button>
          ))}
          <button
            role="tab"
            aria-selected={i === -1}
            onClick={() => setI(-1)}
            className={`font-display rounded-2xl border-2 px-3.5 py-1.5 font-bold ${i === -1 ? "border-kobalt bg-kobalt-tint text-kobalt" : "border-line text-ink-soft hover:bg-wash"}`}
          >
            My own topic
          </button>
        </div>
        {i === -1 ? (
          <input className="input !text-base" placeholder="What do you want to write about?" value={custom} onChange={(e) => setCustom(e.target.value)} />
        ) : null}
        <WritingBox
          key={`${i}-${p.prompt}`}
          prompt={p.prompt}
          promptTr={"promptTr" in p ? p.promptTr : undefined}
          hints={p.hints ?? []}
          lessonDate={"fromLesson" in p && p.fromLesson ? lessonDate : undefined}
        />
      </section>

      <aside>
        <h2 className="font-display mb-3 text-xl font-extrabold">Your past writing</h2>
        {history.length ? (
          <ul className="space-y-2">
            {history.map((w) => (
              <li key={w.id} className="rounded-2xl border-2 border-line">
                <button className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{w.prompt}</span>
                    <span className="block text-xs text-muted">{w.date}</span>
                  </span>
                  <span
                    className={`font-display shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold ${
                      w.score === null ? "bg-wash text-muted" : w.score >= 8 ? "bg-zeytin-tint text-zeytin-depth" : w.score >= 5 ? "bg-cay-tint text-cay-depth" : "bg-nar-tint text-nar-depth"
                    }`}
                  >
                    {w.score !== null ? `${w.score}/10` : w.attempts >= 3 ? "failed" : "waiting"}
                  </span>
                </button>
                {open === w.id ? (
                  <div className="border-t-2 border-line p-3">
                    {w.corrected ? <CorrectionView mine={w.myText} correction={w.corrected} /> : <p className="whitespace-pre-wrap" lang="tr">{w.myText}</p>}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing yet. Your corrected texts will collect here.</p>
        )}
      </aside>
    </div>
  );
}
