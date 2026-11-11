"use client";

import Link from "next/link";
import { useState } from "react";
import { recordReviewAction, submitWeeklyQuizAction } from "@/app/actions";
import type { Card } from "@/lib/db/cards";
import type { Drill } from "@/lib/grammar/drills";
import type { WeeklyQuiz as WeeklyQuizT } from "@/lib/lesson/schema";
import type { WeeklyReport } from "@/lib/lesson/weekly";
import { suggestGrade } from "@/lib/srs/sm2";
import { DrillSet } from "../drill-runner";
import { Speak } from "../speech";
import { TypeAnswer, type AnswerResult } from "../type-answer";
import { ProgressBar } from "../ui";
import { ReportView } from "./report-view";

export function WeeklyQuiz({ quiz, cards, drills, existingReport }: { quiz: WeeklyQuizT; cards: Card[]; drills: Drill[]; existingReport: WeeklyReport | null }) {
  const [part, setPart] = useState<0 | 1 | 2 | 3>(existingReport ? 3 : 0);
  const [vocab, setVocab] = useState({ correct: 0, total: 0 });
  const [drillScore, setDrillScore] = useState({ correct: 0, total: 0 });
  const [i, setI] = useState(0);
  const [trans, setTrans] = useState<AnswerResult | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(existingReport);
  const [busy, setBusy] = useState(false);

  const card = cards[i];
  const steps = ["15 words · Kelimeler", "10 suffix drills · Ekler", "Translation · Çeviri", "Report · Rapor"];

  const finish = async () => {
    if (!trans) return;
    setBusy(true);
    const r = await submitWeeklyQuizAction(quiz.date, {
      vocab,
      drills: drillScore,
      translation: { given: trans.given, reference: quiz.translation.tr, result: trans.result },
    });
    setReport(r);
    setPart(3);
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div>
          <div className="text-xs text-muted">{quiz.date} · week of {quiz.weekStart}</div>
          <h1 className="text-2xl font-bold">
            Weekly check-in <span className="label-tr">· Haftalık değerlendirme</span>
          </h1>
          <p className="text-sm text-muted">≈ 10 minutes. Sunday replaces the lesson with this quiz and saves a progress report.</p>
        </div>
        <ProgressBar value={part} max={3} />
        <div className="flex flex-wrap gap-1 text-xs">
          {steps.map((s, k) => (
            <span key={s} className={`rounded-full px-2.5 py-1 ${k === part ? "bg-fg text-bg" : k < part ? "bg-good-soft text-good" : "bg-card-2 text-muted"}`}>
              {k + 1}. {s}
            </span>
          ))}
        </div>
      </div>

      {part === 0 ? (
        <div className="card space-y-4">
          {card ? (
            <>
              <div className="text-sm text-muted">
                Word {i + 1} / {cards.length}
              </div>
              <div className="text-2xl font-bold">{card.en}</div>
              <TypeAnswer
                key={card.id}
                resetKey={card.id}
                expected={card.tr}
                onChecked={(r) => {
                  setVocab((v) => ({ correct: v.correct + (r.result === "correct" ? 1 : 0), total: v.total + 1 }));
                  recordReviewAction({
                    cardId: card.id,
                    direction: "en-tr",
                    answer: r.given,
                    result: r.result,
                    msTaken: r.ms,
                    grade: suggestGrade(r.result, r.ms, card.tr.length),
                    context: "quiz",
                  });
                }}
              >
                <div className="flex items-center gap-2">
                  <Speak text={card.tr} />
                  <button className="btn-primary" autoFocus onClick={() => (i + 1 >= cards.length ? setPart(1) : setI(i + 1))}>
                    Next →
                  </button>
                </div>
              </TypeAnswer>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-muted">Not enough words learned yet for a vocabulary quiz — on to the drills.</p>
              <button className="btn-primary" onClick={() => setPart(1)}>
                Continue →
              </button>
            </div>
          )}
        </div>
      ) : null}

      {part === 1 ? (
        <DrillSet
          drills={drills}
          context="quiz"
          onFinish={(o) => {
            setDrillScore({ correct: o.filter((x) => x.result === "correct").length, total: o.length });
            setPart(2);
          }}
        />
      ) : null}

      {part === 2 ? (
        <div className="card space-y-4">
          <div className="text-xs tracking-wide text-muted uppercase">Translate into Turkish · Türkçeye çevir</div>
          <div className="text-2xl font-bold">“{quiz.translation.en}”</div>
          <TypeAnswer expected={quiz.translation.tr} onChecked={setTrans} placeholder="Türkçe…">
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-card-2 p-3">
                <span>
                  Reference: <b>{quiz.translation.tr}</b>
                </span>
                <Speak text={quiz.translation.tr} />
              </div>
              <p className="text-xs text-muted">Other correct translations exist — compare meaning, word order and suffixes.</p>
              <button className="btn-primary" disabled={busy} onClick={finish}>
                {busy ? "Building your report…" : "See my weekly report →"}
              </button>
            </div>
          </TypeAnswer>
        </div>
      ) : null}

      {part === 3 && report ? (
        <div className="space-y-3">
          <ReportView report={report} />
          <div className="flex gap-2">
            <Link href="/progress" className="btn-ghost">
              All reports · Progress
            </Link>
            <Link href="/" className="btn-primary">
              Back to Today
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
