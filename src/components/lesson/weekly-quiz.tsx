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
import { Simit } from "../simit";
import { Speak } from "../speech";
import { TypeAnswer, type AnswerResult } from "../type-answer";
import { SpeechBubble } from "../ui";
import { ReportView } from "./report-view";

const PARTS = ["Words", "Suffixes", "Translation", "Report"];

export function WeeklyQuiz({ quiz, cards, drills, existingReport }: { quiz: WeeklyQuizT; cards: Card[]; drills: Drill[]; existingReport: WeeklyReport | null }) {
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
    <FocusShell progress={progress} max={1} right={<span className="font-display hidden text-[15px] font-bold text-muted sm:inline">{PARTS[part]}</span>}>
      {part < 3 ? (
        <div className="mb-5">
          <p className="font-display font-bold text-kobalt">Weekly check-in</p>
          <p className="text-sm text-muted" lang="tr">
            Haftalık değerlendirme, about 10 minutes
          </p>
        </div>
      ) : null}

      {part === 0 ? (
        card ? (
          <>
            <h1 className="font-display text-2xl font-extrabold">Write this in Turkish</h1>
            <div className="my-6 flex items-center gap-3">
              <Simit size={96} mood={ans ? (ans.result === "wrong" ? "oops" : "happy") : "calm"} className="shrink-0" />
              <SpeechBubble>
                <span className="text-xl font-medium">{card.en}</span>
              </SpeechBubble>
            </div>
            <TypeAnswer
              key={card.id}
              resetKey={card.id}
              expected={card.tr}
              sheet="fixed"
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
                className={ans?.result === "correct" ? "btn-success sm:w-44" : ans?.result === "almost" ? "btn-cay sm:w-44" : "btn-danger sm:w-44"}
                autoFocus
                onClick={() => {
                  setAns(null);
                  if (i + 1 >= cards.length) setPart(1);
                  else setI(i + 1);
                }}
              >
                Continue
              </button>
            </TypeAnswer>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Simit size={96} className="shrink-0" />
              <SpeechBubble>Not enough words learned yet for a vocabulary quiz — on to the suffixes.</SpeechBubble>
            </div>
            <FooterBar>
              <button className="btn-primary sm:w-44" onClick={() => setPart(1)}>
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
          <h1 className="font-display text-2xl font-extrabold">Translate into Turkish</h1>
          <div className="my-6 flex items-center gap-3">
            <Simit size={96} mood={trans ? "happy" : "calm"} className="shrink-0" />
            <SpeechBubble>
              <span className="text-xl font-medium">{quiz.translation.en}</span>
            </SpeechBubble>
          </div>
          <TypeAnswer
            expected={quiz.translation.tr}
            onChecked={setTrans}
            placeholder="Türkçe yaz"
            sheet="fixed"
            details={
              <div className="flex items-center gap-2 text-sm">
                <Speak text={quiz.translation.tr} size="sm" />
                <span>Other translations can be right too — compare word order and suffixes.</span>
              </div>
            }
          >
            <button className="btn-primary sm:w-56" disabled={busy} onClick={finish}>
              {busy ? "Building your report…" : "See my weekly report"}
            </button>
          </TypeAnswer>
        </>
      ) : null}

      {part === 3 && report ? (
        <>
          <div className="mb-6 flex flex-col items-center text-center">
            <Simit size={130} mood="proud" />
            <h1 className="font-display mt-3 text-3xl font-extrabold text-cay-depth">Week {report.week} wrapped up</h1>
          </div>
          <ReportView report={report} />
          <FooterBar>
            <Link href="/progress" className="btn-ghost">
              All reports
            </Link>
            <Link href="/" className="btn-primary">
              Back to the path
            </Link>
          </FooterBar>
        </>
      ) : null}
    </FocusShell>
  );
}
