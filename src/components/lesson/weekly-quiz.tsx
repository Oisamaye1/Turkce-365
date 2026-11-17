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
import { FocusShell, FooterBar } from "../focus";
import { Speak } from "../speech";
import type { AnswerResult } from "../type-answer";
import { CardExercise } from "../card-exercise";
import { exerciseFor } from "@/lib/srs/ladder";
import type { PoolWord } from "@/lib/srs/stage";
import { Prompt, RESULT_COPY } from "../ui";
import { ReportView } from "./report-view";

const PARTS = ["Words", "Suffixes", "Translation", "Report"];

export function WeeklyQuiz({
  quiz,
  cards,
  drills,
  existingReport,
  stage,
  pool,
}: {
  quiz: WeeklyQuizT;
  cards: Card[];
  drills: Drill[];
  existingReport: WeeklyReport | null;
  stage: number;
  pool: PoolWord[];
}) {
  const [part, setPart] = useState<0 | 1 | 2 | 3>(existingReport ? 3 : 0);
  const [vocab, setVocab] = useState({ correct: 0, total: 0 });
  const [drillScore, setDrillScore] = useState({ correct: 0, total: 0 });
  const [i, setI] = useState(0);
  const [di, setDi] = useState(0);
  const [ans, setAns] = useState<AnswerResult | null>(null);
  const [trans, setTrans] = useState<AnswerResult | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(existingReport);
  const [busy, setBusy] = useState(false);

  const card = cards[i];
  const progress =
    part === 0 ? (i / Math.max(1, cards.length)) * 0.4 : part === 1 ? 0.4 + (di / Math.max(1, drills.length)) * 0.4 : part === 2 ? 0.85 : 1;

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
    window.scrollTo({ top: 0 });
  };

  return (
    <FocusShell progress={progress} max={1} right={PARTS[part]}>
      {part < 3 ? (
        <p className="mb-6 text-[15px] text-muted">
          <span className="font-medium text-accent-text">Weekly check-in</span>
          <span className="ml-2" lang="tr">
            Haftalık değerlendirme
          </span>
        </p>
      ) : null}

      {part === 0 ? (
        card ? (
          <>
            <CardExercise
              key={card.id}
              // The check-in asks for a little more than reviews, still paced by stage.
              exercise={exerciseFor({ direction: "en-tr", repetitions: Math.min(stage + 1, 5), stage, tr: card.tr, pos: card.pos })}
              card={card}
              direction="en-tr"
              pool={pool}
              label={`${i + 1} of ${cards.length}`}
              result={ans}
              showLadder={false}
              onChecked={(r) => {
                setAns(r);
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
              <button
                className={`${ans ? RESULT_COPY[ans.result].btn : "btn-primary"} sm:w-40`}
                autoFocus
                onClick={() => {
                  setAns(null);
                  if (i + 1 >= cards.length) setPart(1);
                  else setI(i + 1);
                }}
              >
                Continue
              </button>
            </CardExercise>
          </>
        ) : (
          <>
            <p className="text-[17px] text-ink-soft">Not enough words learned yet for a vocabulary quiz — on to the suffixes.</p>
            <FooterBar>
              <button className="btn-primary sm:w-40" onClick={() => setPart(1)}>
                Continue
              </button>
            </FooterBar>
          </>
        )
      ) : null}

      {part === 1 ? (
        <DrillSet
          drills={drills}
          context="quiz"
          onProgress={setDi}
          onFinish={(o) => {
            setDrillScore({ correct: o.filter((x) => x.result === "correct").length, total: o.length });
            setPart(2);
          }}
        />
      ) : null}

      {part === 2 ? (
        <>
          <CardExercise
            // A whole sentence: built from word tiles until stage 4, typed after that.
            exercise={stage <= 3 ? "build" : "type"}
            card={{ id: 9_000_001, tr: quiz.translation.tr, en: quiz.translation.en, pos: "sentence", unit: 0 }}
            direction="en-tr"
            pool={pool}
            label="Translate a sentence from this week"
            result={trans}
            showLadder={false}
            onChecked={setTrans}
            details={
              <div className="flex items-center gap-2 text-[14px] text-ink-soft">
                <Speak text={quiz.translation.tr} size="sm" />
                <span>Other translations can be right too. Compare word order and endings.</span>
              </div>
            }
          >
            <button className="btn-primary sm:w-52" disabled={busy} onClick={finish}>
              {busy ? "Building your report…" : "See my weekly report"}
            </button>
          </CardExercise>
        </>
      ) : null}

      {part === 3 && report ? (
        <>
          <h1 className="display-xl mb-10 text-[48px] sm:text-[64px]" lang="tr">
            Haftan bitti.
            <span className="mt-3 block font-sans text-[17px] font-normal tracking-normal text-ink-soft">The week of {report.week}, in numbers.</span>
          </h1>
          <ReportView report={report} />
          <FooterBar>
            <Link href="/progress" className="btn-secondary">
              All reports
            </Link>
            <Link href="/" className="btn-primary">
              Back to today
            </Link>
          </FooterBar>
        </>
      ) : null}
    </FocusShell>
  );
}
