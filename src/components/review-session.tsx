"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { recordReviewAction } from "@/app/actions";
import type { ReviewItem } from "@/lib/db/cards";
import { GRADES, NEW_CARD_STATE, previewIntervals, suggestGrade, type Grade } from "@/lib/srs/sm2";
import { FocusShell, FooterBar } from "./focus";
import { IconFlame } from "./icons";
import { Speak } from "./speech";
import type { AnswerResult } from "./type-answer";
import { Badge, RESULT_COPY } from "./ui";
import { CardExercise } from "./card-exercise";
import { autoGraded, exerciseFor } from "@/lib/srs/ladder";
import type { PoolWord } from "@/lib/srs/stage";

const GRADE_LABEL: Record<Grade, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

interface QueueItem extends ReviewItem {
  key: string;
  isNew: boolean;
  relearn?: boolean;
}

export function ReviewSession({ due, fresh, stage, pool }: { due: ReviewItem[]; fresh: ReviewItem[]; stage: number; pool: PoolWord[] }) {
  // One new word after every three reviews.
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
        <div className="pt-10">
          <h1 className="display-xl text-[56px]" lang="tr">
            Tamam.
          </h1>
          <p className="mt-4 max-w-[46ch] text-[17px] text-ink-soft">
            Nothing is due and today&apos;s new words are done. Come back tomorrow, or practise your suffixes.
          </p>
        </div>
        <FooterBar>
          <Link href="/gym" className="btn-secondary">
            Practise suffixes
          </Link>
          <Link href="/" className="btn-primary">
            Back to today
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
        <div className="pt-8">
          <h1 className="display-xl text-[56px] sm:text-[72px]" lang="tr">
            Aferin.
          </h1>
          <p className="mt-3 text-[17px] text-ink-soft">Reviews done for today.</p>
          <dl className="stagger mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6 tabular">
            {[
              { label: "answers", value: n },
              { label: "accuracy", value: `${acc}%` },
              { label: "minutes", value: mins },
            ].map((x, i) => (
              <div key={x.label} style={{ "--i": i } as React.CSSProperties}>
                <dd className="font-display text-[42px] leading-none font-semibold">{x.value}</dd>
                <dt className="mt-2 text-[14px] text-muted">{x.label}</dt>
              </div>
            ))}
          </dl>
          {stats.best >= 3 ? <p className="mt-6 text-[15px] text-ink-soft">Longest run of correct answers: {stats.best}.</p> : null}
        </div>
        <FooterBar>
          <Link href="/" className="btn-secondary">
            Back to today
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
  const exercise = exerciseFor({ direction: item.direction, repetitions: state.repetitions, isNew: item.isNew, stage, tr: card.tr, pos: card.pos });
  const auto = autoGraded(exercise);
  // Easier exercises are graded for you: right → Good, nearly → Hard, wrong → Again.
  const suggested: Grade = answer
    ? auto
      ? answer.result === "correct"
        ? "good"
        : answer.result === "almost"
          ? "hard"
          : "again"
      : suggestGrade(answer.result, answer.ms, (enToTr ? card.tr : card.en).length)
    : "good";

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

  const right = (
    <span className="flex items-center gap-3">
      {stats.combo >= 3 ? (
        <span key={stats.combo} className="flex animate-pop items-center gap-1 text-accent-text" aria-label={`${stats.combo} correct in a row`}>
          <IconFlame size={16} />
          {stats.combo}
        </span>
      ) : null}
      <span>
        {Math.min(pos + 1, queue.length)}/{queue.length}
      </span>
    </span>
  );

  const tags = (
    <div className="mb-6 flex flex-wrap gap-2">
      {item.isNew ? <Badge tone="accent">New word</Badge> : null}
      {item.relearn ? <Badge tone="warn">Once more</Badge> : null}
      {card.leech ? <Badge tone="bad">Keeps slipping</Badge> : null}
      {card.source === "correction" ? <Badge tone="brand">From your writing</Badge> : null}
    </div>
  );

  return (
    <FocusShell progress={pos} max={queue.length} right={right}>
      {tags}
      {phase === "intro" ? (
        <>
          <p className="text-[15px] text-muted">New word, unit {card.unit || "–"}</p>
          <div key={item.key} className="mt-4 flex animate-slide-in items-start justify-between gap-4">
            <h1 className="display-xl text-[52px] sm:text-[72px]" lang="tr">
              {card.tr}
            </h1>
            <div className="mt-2 flex shrink-0 gap-1">
              <Speak text={card.tr} size="lg" />
              <Speak text={card.tr} slow size="lg" />
            </div>
          </div>
          <p className="mt-4 text-[21px] text-ink-soft">{card.en}</p>
          {card.exTr ? (
            <figure className="mt-10 border-l-2 border-accent pl-5">
              <p className="tr-word text-[21px] font-medium" lang="tr">
                {card.exTr}
              </p>
              <figcaption className="mt-1 text-ink-soft">{card.exEn}</figcaption>
            </figure>
          ) : null}
          {card.note ? <p className="mt-6 text-[15px] text-ink-soft">{card.note}</p> : null}
          <FooterBar note={card.pos}>
            <button className="btn-primary sm:w-40" autoFocus onClick={() => setPhase("test")}>
              Got it
            </button>
          </FooterBar>
        </>
      ) : (
        <CardExercise
          key={item.key}
          exercise={exercise}
          card={card}
          direction={item.direction}
          pool={pool}
          onChecked={setAnswer}
          result={answer}
          details={
            <div className="space-y-3">
              {card.exTr ? (
                <div className="flex items-start gap-2 text-[15px]">
                  <Speak text={card.tr} size="sm" />
                  <p>
                    <span lang="tr" className="font-medium">
                      {card.exTr}
                    </span>
                    <span className="block text-ink-soft">{card.exEn}</span>
                  </p>
                </div>
              ) : null}
              {!auto ? (
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rate how well you knew it">
                  <span className="mr-1 text-[13px] text-ink-soft">Next review</span>
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => grade(g)}
                      disabled={busy}
                      className={`rounded-md px-2 py-1 text-[13px] tabular ${suggested === g ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper/70"}`}
                    >
                      {GRADE_LABEL[g]} <span className="opacity-70">{previews[g]}</span>
                    </button>
                  ))}
                </div>
              ) : answer?.result === "correct" ? (
                <p className="text-[14px] text-ink-soft">Next time this one gets a little harder.</p>
              ) : (
                <p className="text-[14px] text-ink-soft">It comes back again in this session, a bit easier.</p>
              )}
            </div>
          }
        >
          <button className={`${answer ? RESULT_COPY[answer.result].btn : "btn-primary"} sm:w-40`} autoFocus disabled={busy} onClick={() => grade(suggested)}>
            Continue
          </button>
        </CardExercise>
      )}
    </FocusShell>
  );
}
