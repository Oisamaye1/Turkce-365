"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { recordReviewAction } from "@/app/actions";
import type { ReviewItem } from "@/lib/db/cards";
import { GRADES, NEW_CARD_STATE, previewIntervals, suggestGrade, type Grade } from "@/lib/srs/sm2";
import { FocusShell, FooterBar } from "./focus";
import { IconFlame } from "./icons";
import { Simit } from "./simit";
import { Speak } from "./speech";
import { TypeAnswer, type AnswerResult } from "./type-answer";
import { Badge, SpeechBubble } from "./ui";

const GRADE_LABEL: Record<Grade, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

interface QueueItem extends ReviewItem {
  key: string;
  isNew: boolean;
  relearn?: boolean;
}

export function ReviewSession({ due, fresh }: { due: ReviewItem[]; fresh: ReviewItem[] }) {
  // Interleave new cards among the reviews (one new after every three reviews).
  const initial = useMemo(() => {
    const q: QueueItem[] = [];
    const d = due.map((x) => ({ ...x, key: `${x.card.id}-${x.direction}`, isNew: false }));
    const f = fresh.map((x) => ({ ...x, key: `${x.card.id}-new`, isNew: true }));
    while (d.length || f.length) {
      for (let i = 0; i < 3 && d.length; i++) q.push(d.shift()!);
      if (f.length) q.push(f.shift()!);
    }
    return q;
  }, [due, fresh]);

  const [queue, setQueue] = useState<QueueItem[]>(initial);
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<"intro" | "test">(initial[0]?.isNew ? "intro" : "test");
  const [answer, setAnswer] = useState<AnswerResult | null>(null);
  const [stats, setStats] = useState({ correct: 0, almost: 0, wrong: 0, combo: 0, best: 0 });
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const item = queue[pos];

  if (!initial.length) {
    return (
      <FocusShell progress={1} max={1}>
        <div className="flex flex-col items-center pt-10 text-center">
          <Simit size={150} mood="happy" />
          <h1 className="font-display mt-4 text-3xl font-extrabold">All caught up</h1>
          <p className="mt-2 max-w-sm text-ink-soft">No reviews are due and today&apos;s new words are done. Come back tomorrow, or train your suffixes.</p>
        </div>
        <FooterBar>
          <Link href="/gym" className="btn-ghost">
            Suffix gym
          </Link>
          <Link href="/" className="btn-primary">
            Back to the path
          </Link>
        </FooterBar>
      </FocusShell>
    );
  }

  if (!item) {
    const n = stats.correct + stats.almost + stats.wrong;
    const acc = n ? Math.round(((stats.correct + stats.almost * 0.5) / n) * 100) : 0;
    const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    return (
      <FocusShell progress={1} max={1}>
        <div className="flex flex-col items-center pt-6 text-center">
          <Simit size={150} mood="proud" />
          <h1 className="font-display mt-4 text-3xl font-extrabold text-cay-depth">Reviews done!</h1>
          <p className="text-ink-soft" lang="tr">
            Tekrarlar bitti — aferin.
          </p>
          <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
            {[
              { label: "Answers", value: n, cls: "border-kobalt text-kobalt" },
              { label: "Accuracy", value: `${acc}%`, cls: "border-zeytin text-zeytin-depth" },
              { label: "Minutes", value: mins, cls: "border-cay text-cay-depth" },
            ].map((x) => (
              <div key={x.label} className={`rounded-2xl border-2 p-3 ${x.cls}`}>
                <div className="font-display text-3xl font-extrabold">{x.value}</div>
                <div className="text-sm text-ink-soft">{x.label}</div>
              </div>
            ))}
          </div>
          {stats.best >= 3 ? <p className="mt-4 text-sm text-muted">Longest run of correct answers: {stats.best}</p> : null}
        </div>
        <FooterBar>
          <Link href="/" className="btn-ghost">
            Back to the path
          </Link>
          <Link href="/lesson" className="btn-primary">
            Start today&apos;s lesson
          </Link>
        </FooterBar>
      </FocusShell>
    );
  }

  const card = item.card;
  const enToTr = item.direction === "en-tr";
  const state = item.state ?? NEW_CARD_STATE;
  const previews = previewIntervals(state);
  const suggested = answer ? suggestGrade(answer.result, answer.ms, (enToTr ? card.tr : card.en).length) : "good";

  const grade = async (g: Grade) => {
    if (!answer || busy) return;
    setBusy(true);
    await recordReviewAction({ cardId: card.id, direction: item.direction, answer: answer.given, result: answer.result, msTaken: answer.ms, grade: g });
    setStats((s) => {
      const combo = answer.result === "correct" ? s.combo + 1 : 0;
      return { ...s, [answer.result]: s[answer.result] + 1, combo, best: Math.max(s.best, combo) };
    });
    const nextQueue = g === "again" ? [...queue, { ...item, key: `${item.key}-r${pos}`, isNew: false, relearn: true, state: { ...state, repetitions: 0 } }] : queue;
    setQueue(nextQueue);
    setPos(pos + 1);
    setAnswer(null);
    setPhase(nextQueue[pos + 1]?.isNew ? "intro" : "test");
    setBusy(false);
  };

  const combo =
    stats.combo >= 3 ? (
      <span className="font-display flex items-center gap-1 text-lg font-extrabold text-cay-depth" aria-label={`${stats.combo} correct in a row`}>
        <IconFlame size={22} />
        {stats.combo}
      </span>
    ) : null;

  return (
    <FocusShell progress={pos} max={queue.length} right={combo}>
      <div className="mb-5 flex flex-wrap gap-2">
        {item.isNew ? <Badge tone="accent">New word</Badge> : null}
        {item.relearn ? <Badge tone="warn">One more time</Badge> : null}
        {card.leech ? <Badge tone="bad">Tricky word</Badge> : null}
        {card.source === "correction" ? <Badge tone="warn">From your writing</Badge> : null}
      </div>

      {phase === "intro" ? (
        <>
          <h1 className="font-display text-2xl font-extrabold">Meet a new word</h1>
          <div className="mt-6 flex flex-col items-center rounded-3xl border-2 border-line px-5 py-8 text-center">
            <div className="flex items-center gap-3">
              <span className="tr-word text-5xl sm:text-6xl" lang="tr">
                {card.tr}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Speak text={card.tr} size="lg" />
              <Speak text={card.tr} slow size="lg" />
            </div>
            <p className="mt-4 text-xl text-ink-soft">{card.en}</p>
            {card.exTr ? (
              <div className="mt-6 w-full max-w-md rounded-2xl bg-wash px-4 py-3 text-left">
                <div className="flex items-center gap-2" lang="tr">
                  <Speak text={card.exTr} size="sm" />
                  <span className="font-medium">{card.exTr}</span>
                </div>
                <div className="mt-1 text-sm text-muted">{card.exEn}</div>
              </div>
            ) : null}
            {card.note ? <p className="mt-3 text-sm text-ink-soft">{card.note}</p> : null}
          </div>
          <FooterBar note={`${card.pos}${card.unit ? `, unit ${card.unit}` : ""}`}>
            <button className="btn-primary sm:w-44" autoFocus onClick={() => setPhase("test")}>
              Got it
            </button>
          </FooterBar>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-extrabold">{enToTr ? "Write this in Turkish" : "What does this mean?"}</h1>
          <div className="my-6 flex items-center gap-3">
            <Simit size={96} mood={answer ? (answer.result === "wrong" ? "oops" : "happy") : "calm"} className="shrink-0" />
            <SpeechBubble>
              <div className="flex items-center gap-3">
                {!enToTr ? <Speak text={card.tr} size="sm" /> : null}
                <span className={enToTr ? "text-xl font-medium" : "tr-word text-2xl"} lang={enToTr ? "en" : "tr"}>
                  {enToTr ? card.en : card.tr}
                </span>
              </div>
            </SpeechBubble>
          </div>
          <TypeAnswer
            key={item.key}
            resetKey={item.key}
            expected={enToTr ? card.tr : card.en}
            lang={enToTr ? "tr" : "en"}
            onChecked={setAnswer}
            sheet="fixed"
            details={
              <div className="space-y-2">
                {card.exTr ? (
                  <div className="flex items-start gap-2 text-sm">
                    <Speak text={card.tr} size="sm" />
                    <span>
                      <span lang="tr">{card.exTr}</span>
                      <span className="block text-ink-soft">{card.exEn}</span>
                    </span>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5" aria-label="How well did you know it?">
                  <span className="text-xs text-ink-soft">Rate it:</span>
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => grade(g)}
                      disabled={busy}
                      className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-semibold ${
                        suggested === g ? "border-ink bg-ink text-paper" : "border-ink/20 bg-paper/60 text-ink-soft hover:border-ink/40"
                      }`}
                    >
                      {GRADE_LABEL[g]} {previews[g]}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            <button
              className={answer?.result === "correct" ? "btn-success sm:w-44" : answer?.result === "almost" ? "btn-cay sm:w-44" : "btn-danger sm:w-44"}
              autoFocus
              disabled={busy}
              onClick={() => grade(suggested)}
            >
              Continue
            </button>
          </TypeAnswer>
        </>
      )}
    </FocusShell>
  );
}
