"use client";

import { useState } from "react";
import { recordDrillAction } from "@/app/actions";
import type { Drill } from "@/lib/grammar/drills";
import type { CheckResult } from "@/lib/turkish/answer";
import { WordAnatomy } from "./anatomy";
import { Speak } from "./speech";
import { TypeAnswer, type AnswerResult } from "./type-answer";
import { RESULT_COPY } from "./ui";

const RULE_TEXT: Record<string, string> = {
  "vowel-harmony-2": "two-way harmony (a/e)",
  "vowel-harmony-4": "four-way harmony (ı/i/u/ü)",
  "consonant-assimilation": "d becomes t after f s t k ç ş h p",
  "consonant-softening": "softening: p→b, ç→c, t→d, k→ğ",
  "buffer-y": "buffer y after a vowel",
  "buffer-s": "buffer s for his/her",
  "buffer-n": "buffer n before the genitive",
  "pronominal-n": "extra n after his/her/their",
  "vowel-drop": "the last vowel drops (şehir → şehri)",
  "consonant-doubling": "the consonant doubles (hak → hakkı)",
  "harmony-exception": "loanword that takes front vowels",
  "irregular-stem": "irregular stem",
  "vowel-narrowing": "the stem vowel changes before -yor / y",
  "proper-noun-apostrophe": "apostrophe after a name",
};

export interface DrillOutcome {
  drill: Drill;
  result: CheckResult;
  given: string;
}

/** A suffix drill: root plus the target meaning; the learner types the full form. */
export function DrillCard({
  drill,
  context,
  onDone,
  onRecorded,
  sheet = "fixed",
}: {
  drill: Drill;
  context: "gym" | "lesson" | "quiz";
  onDone: (o: DrillOutcome) => void;
  onRecorded?: (r: { unlocked: number | null; mastery: number }) => void;
  sheet?: "fixed" | "inline";
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

  const rules = drill.rules.filter((r) => RULE_TEXT[r]).map((r) => RULE_TEXT[r]);

  return (
    <div>
      <p className="text-[15px] text-muted">Build the Turkish for</p>
      <p className="font-display mt-1 text-[33px] leading-tight font-medium sm:text-[42px]">“{drill.prompt}”</p>
      <div className="mt-5 mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-[15px]" aria-label="Start from">
        <span className="tr-word rounded-md border-b-2 border-ink bg-haze px-2 py-0.5 text-[19px]" lang="tr">
          {drill.root}
        </span>
        <span className="text-muted">{drill.rootEn}</span>
        {drill.tags.map((t) => (
          <span key={t} className="flex items-center gap-2">
            <span className="text-muted">+</span>
            <span className="rounded-md bg-brand-tint px-2 py-0.5 text-brand-text">{t}</span>
          </span>
        ))}
      </div>

      <TypeAnswer
        key={drill.id}
        resetKey={drill.id}
        expected={drill.answer}
        alternatives={drill.alternatives}
        strict
        sheet={sheet}
        onChecked={checked}
        details={
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <WordAnatomy parts={drill.breakdown} size="sm" />
              <Speak text={drill.answer} size="sm" />
            </div>
            {rules.length ? <p className="text-[14px] text-ink-soft">{rules.join("; ")}</p> : null}
          </div>
        }
      >
        <button
          className={`${ans ? RESULT_COPY[ans.result].btn : "btn-primary"} sm:w-40`}
          autoFocus
          onClick={() => ans && onDone({ drill, result: ans.result, given: ans.given })}
        >
          Continue
        </button>
      </TypeAnswer>
    </div>
  );
}

/** Runs a fixed list of drills and reports the outcomes. */
export function DrillSet({
  drills,
  context,
  onFinish,
  onProgress,
}: {
  drills: Drill[];
  context: "lesson" | "quiz";
  onFinish: (outcomes: DrillOutcome[]) => void;
  onProgress?: (i: number) => void;
}) {
  const [i, setI] = useState(0);
  const [outcomes, setOutcomes] = useState<DrillOutcome[]>([]);
  if (!drills.length) {
    return (
      <button className="btn-primary" onClick={() => onFinish([])}>
        Continue
      </button>
    );
  }
  const d = drills[i];
  return (
    <div>
      <p className="mb-4 text-[14px] text-muted tabular">
        Drill {Math.min(i + 1, drills.length)} of {drills.length}
      </p>
      {d ? (
        <DrillCard
          key={d.id}
          drill={d}
          context={context}
          onDone={(o) => {
            const next = [...outcomes, o];
            setOutcomes(next);
            onProgress?.(i + 1);
            if (i + 1 >= drills.length) onFinish(next);
            else setI(i + 1);
          }}
        />
      ) : null}
    </div>
  );
}
