"use client";

import Link from "next/link";
import { useState } from "react";
import { completeChapterAction } from "@/app/actions";
import type { QuizQuestion } from "@/lib/learn/chapters";
import { IconArrow } from "../icons";
import { Choices } from "../practice/shared";

/** End-of-chapter check: one question at a time, explanation after each answer. */
export function ChapterQuiz({ id, questions, next }: { id: string; questions: QuizQuestion[]; next?: { id: string; title: string } }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = questions[i];

  if (done)
    return (
      <div className="animate-rise rounded-[16px] bg-ok-tint p-6">
        <p className="font-display text-[26px] font-semibold text-ok-text">
          {score} of {questions.length} right.{score === questions.length ? " Mükemmel!" : score >= questions.length - 1 ? " Aferin!" : ""}
        </p>
        <p className="mt-1 text-ink-soft">
          {score === questions.length ? "This chapter is done." : "Saved. Read the sections again any time, then try once more."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {next ? (
            <Link href={`/learn/${next.id}`} className="btn-primary">
              Next: {next.title} <IconArrow size={16} />
            </Link>
          ) : (
            <Link href="/learn" className="btn-primary">
              All chapters
            </Link>
          )}
          <button
            className="btn-secondary"
            onClick={() => {
              setI(0);
              setScore(0);
              setPicked(null);
              setDone(false);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );

  const right = q.options[q.answer];
  return (
    <div>
      <p className="text-[14px] text-muted tabular">
        Question {i + 1} of {questions.length}
      </p>
      <p key={i} className="font-display mt-1 mb-5 animate-slide-in text-[21px] leading-snug font-semibold">
        {q.q}
      </p>
      <Choices
        options={q.options}
        answer={right}
        picked={picked}
        cols={1}
        onPick={(o) => {
          setPicked(o);
          if (o === right) setScore((s) => s + 1);
        }}
      />
      {picked !== null ? (
        <div className={`mt-4 flex animate-rise flex-wrap items-center justify-between gap-3 rounded-[12px] p-4 ${picked === right ? "bg-ok-tint" : "bg-bad-tint"}`}>
          <p className="text-[15px] text-ink">
            <b className={picked === right ? "text-ok-text" : "text-bad-text"}>{picked === right ? "Doğru. " : "Not quite. "}</b>
            {q.why}
          </p>
          <button
            className={picked === right ? "btn-ok" : "btn-bad"}
            autoFocus
            onClick={() => {
              if (i + 1 >= questions.length) {
                setDone(true);
                completeChapterAction(id, score, questions.length);
              } else {
                setI(i + 1);
                setPicked(null);
              }
            }}
          >
            {i + 1 >= questions.length ? "Finish" : "Next"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
