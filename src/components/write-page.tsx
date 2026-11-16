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
  fromPlan?: boolean;
}

const SHORT = ["Introduce yourself", "Your morning", "A favourite place", "Invite a colleague", "Last weekend"];

export function WritePage({ prompts, lessonDate, history }: { prompts: Prompt[]; lessonDate?: string; history: WritingRow[] }) {
  const [i, setI] = useState(0);
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const p = i === -1 ? { prompt: custom || "Write about anything you like", hints: [] } : prompts[i];
  const offset = prompts.filter((x) => x.fromLesson || x.fromPlan).length;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 space-y-8">
        <div className="-mx-1 flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Writing topics">
          {prompts.map((x, k) => (
            <button
              key={k}
              role="tab"
              aria-selected={k === i}
              onClick={() => setI(k)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-[15px] ${k === i ? "border-accent font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
            >
              {x.fromPlan ? "Plan task" : x.fromLesson ? "Today's lesson" : (SHORT[k - offset] ?? `Topic ${k}`)}
            </button>
          ))}
          <button
            role="tab"
            aria-selected={i === -1}
            onClick={() => setI(-1)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[15px] ${i === -1 ? "border-accent font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            My own topic
          </button>
        </div>
        {i === -1 ? (
          <input className="input" placeholder="What do you want to write about?" value={custom} onChange={(e) => setCustom(e.target.value)} />
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
        <h2 className="font-display mb-3 text-[21px] font-semibold">Past writing</h2>
        {history.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {history.map((w) => (
              <li key={w.id}>
                <button className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px]">{w.prompt}</span>
                    <span className="block text-[13px] text-muted">{w.date}</span>
                  </span>
                  <span
                    className={`shrink-0 text-[14px] tabular ${
                      w.score === null ? "text-muted" : w.score >= 8 ? "text-ok-text" : w.score >= 5 ? "text-warn-text" : "text-bad-text"
                    }`}
                  >
                    {w.score !== null ? `${w.score}/10` : w.attempts >= 3 ? "failed" : "waiting"}
                  </span>
                </button>
                {open === w.id ? (
                  <div className="pb-5">
                    {w.corrected ? <CorrectionView mine={w.myText} correction={w.corrected} /> : <p className="whitespace-pre-wrap" lang="tr">{w.myText}</p>}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-muted">Nothing yet. Your corrected texts collect here.</p>
        )}
      </aside>
    </div>
  );
}
