"use client";

import { useState } from "react";
import { recordDrillAction } from "@/app/actions";
import type { Drill } from "@/lib/grammar/drills";
import type { CheckResult } from "@/lib/turkish/answer";
import { Speak } from "./speech";
import { TypeAnswer, type AnswerResult } from "./type-answer";
import { ProgressBar } from "./ui";

const RULE_TEXT: Record<string, string> = {
  "vowel-harmony-2": "2-way harmony (a/e)",
  "vowel-harmony-4": "4-way harmony (ı/i/u/ü)",
  "consonant-assimilation": "d → t after f s t k ç ş h p",
  "consonant-softening": "softening p→b ç→c t→d k→ğ",
  "buffer-y": "buffer y after a vowel",
  "buffer-s": "buffer s (3rd person possessive)",
  "buffer-n": "buffer n (genitive)",
  "pronominal-n": "n after his/her/their",
  "vowel-drop": "vowel drops (şehir → şehri)",
  "consonant-doubling": "consonant doubles (hak → hakkı)",
  "harmony-exception": "loanword exception (front vowels)",
  "irregular-stem": "irregular stem",
  "vowel-narrowing": "stem vowel changes before -yor / y",
  "proper-noun-apostrophe": "apostrophe after a proper name",
};

export interface DrillOutcome {
  drill: Drill;
  result: CheckResult;
  given: string;
}

export function DrillCard({
  drill,
  context,
  onDone,
  onRecorded,
}: {
  drill: Drill;
  context: "gym" | "lesson" | "quiz";
  onDone: (o: DrillOutcome) => void;
  onRecorded?: (r: { unlocked: number | null; mastery: number }) => void;
}) {
  const [ans, setAns] = useState<AnswerResult | null>(null);

  const checked = async (r: AnswerResult) => {
    setAns(r);
    const rec = await recordDrillAction({
      stepId: drill.stepId,
      result: r.result,
      answer: r.given,
      expected: drill.answer,
      prompt: drill.prompt,
      rules: drill.rules,
      context,
    });
    onRecorded?.(rec);
  };

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-card-2 px-3 py-1.5 font-mono text-lg font-bold">{drill.root}</span>
        <span className="text-muted">({drill.rootEn})</span>
        <span className="text-muted">+</span>
        {drill.tags.map((t) => (
          <span key={t} className="chip !text-fg">
            {t}
          </span>
        ))}
      </div>
      <div>
        <div className="text-xs tracking-wide text-muted uppercase">Write the Turkish for</div>
        <div className="text-2xl font-bold">“{drill.prompt}”</div>
      </div>
      <TypeAnswer key={drill.id} resetKey={drill.id} expected={drill.answer} alternatives={drill.alternatives} strict onChecked={checked}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-card-2 p-3">
            <span className="text-xs text-muted">Breakdown · Ekler:</span>
            {drill.breakdown.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && p !== "·" ? <span className="text-muted">+</span> : null}
                <span className={`rounded-md px-1.5 py-0.5 font-mono ${i === 0 ? "bg-card font-bold" : p === "·" ? "" : "bg-sea-soft text-sea"}`}>{p}</span>
              </span>
            ))}
            <Speak text={drill.answer} />
          </div>
          {drill.rules.length ? (
            <div className="flex flex-wrap gap-1.5">
              {drill.rules
                .filter((r) => RULE_TEXT[r])
                .map((r) => (
                  <span key={r} className="chip">
                    {RULE_TEXT[r]}
                  </span>
                ))}
            </div>
          ) : null}
          <button className="btn-primary" autoFocus onClick={() => ans && onDone({ drill, result: ans.result, given: ans.given })}>
            Next · Sonraki →
          </button>
        </div>
      </TypeAnswer>
    </div>
  );
}

/** Runs a fixed list of drills and reports the outcomes. */
export function DrillSet({
  drills,
  context,
  onFinish,
}: {
  drills: Drill[];
  context: "lesson" | "quiz";
  onFinish: (outcomes: DrillOutcome[]) => void;
}) {
  const [i, setI] = useState(0);
  const [outcomes, setOutcomes] = useState<DrillOutcome[]>([]);
  if (!drills.length) {
    return (
      <button className="btn-primary" onClick={() => onFinish([])}>
        Continue →
      </button>
    );
  }
  const d = drills[i];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="shrink-0">
          Drill {Math.min(i + 1, drills.length)} / {drills.length}
        </span>
        <ProgressBar value={i} max={drills.length} />
      </div>
      {d ? (
        <DrillCard
          key={d.id}
          drill={d}
          context={context}
          onDone={(o) => {
            const next = [...outcomes, o];
            setOutcomes(next);
            if (i + 1 >= drills.length) onFinish(next);
            else setI(i + 1);
          }}
        />
      ) : null}
    </div>
  );
}
