"use client";

import { useState } from "react";
import { recordDrillAction } from "@/app/actions";
import type { Drill } from "@/lib/grammar/drills";
import type { CheckResult } from "@/lib/turkish/answer";
import { Speak } from "./speech";
import { TypeAnswer, type AnswerResult } from "./type-answer";

const RULE_TEXT: Record<string, string> = {
  "vowel-harmony-2": "2-way harmony (a/e)",
  "vowel-harmony-4": "4-way harmony (ı/i/u/ü)",
  "consonant-assimilation": "d becomes t after f s t k ç ş h p",
  "consonant-softening": "softening: p→b ç→c t→d k→ğ",
  "buffer-y": "buffer y after a vowel",
  "buffer-s": "buffer s for his/her",
  "buffer-n": "buffer n (genitive)",
  "pronominal-n": "extra n after his/her/their",
  "vowel-drop": "vowel drops (şehir → şehri)",
  "consonant-doubling": "consonant doubles (hak → hakkı)",
  "harmony-exception": "loanword takes front vowels",
  "irregular-stem": "irregular stem",
  "vowel-narrowing": "stem vowel changes before -yor / y",
  "proper-noun-apostrophe": "apostrophe after a name",
};

export interface DrillOutcome {
  drill: Drill;
  result: CheckResult;
  given: string;
}

/** Suffix "building blocks": root + tags, then the learner types the full form. */
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

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl leading-tight font-extrabold">Build the word for “{drill.prompt}”</h2>

      <div className="flex flex-wrap items-center gap-2" aria-label="Building blocks">
        <span className="font-display rounded-2xl border-2 border-b-4 border-line bg-paper px-4 py-2 text-2xl font-extrabold text-ink" lang="tr">
          {drill.root}
        </span>
        {drill.tags.map((t) => (
          <span key={t} className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-muted">+</span>
            <span className="font-display rounded-2xl border-2 border-b-4 border-turkuaz/50 bg-turkuaz-tint px-3 py-2 font-bold text-turkuaz-depth">{t}</span>
          </span>
        ))}
      </div>
      <p className="text-sm text-muted">
        {drill.root} means “{drill.rootEn}”.
      </p>

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
            <div className="flex flex-wrap items-center gap-1">
              {drill.breakdown.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && p !== "·" ? <span className="text-ink-soft">+</span> : null}
                  {p === "·" ? (
                    <span className="w-2" />
                  ) : (
                    <span className={`font-display rounded-lg px-2 py-0.5 font-bold ${i === 0 ? "bg-paper text-ink" : "bg-paper/70 text-turkuaz-depth"}`}>{p}</span>
                  )}
                </span>
              ))}
              <Speak text={drill.answer} size="sm" className="ml-1" />
            </div>
            {drill.rules.some((r) => RULE_TEXT[r]) ? (
              <p className="text-sm text-ink-soft">
                {drill.rules
                  .filter((r) => RULE_TEXT[r])
                  .map((r) => RULE_TEXT[r])
                  .join("; ")}
              </p>
            ) : null}
          </div>
        }
      >
        <button
          className={ans?.result === "correct" ? "btn-success sm:w-44" : ans?.result === "almost" ? "btn-cay sm:w-44" : "btn-danger sm:w-44"}
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
      <p className="mb-3 text-sm text-muted">
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
