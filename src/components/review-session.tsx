"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { recordReviewAction } from "@/app/actions";
import type { ReviewItem } from "@/lib/db/cards";
import { GRADES, NEW_CARD_STATE, previewIntervals, suggestGrade, type Grade } from "@/lib/srs/sm2";
import { Speak } from "./speech";
import { TypeAnswer, type AnswerResult } from "./type-answer";
import { Badge, ProgressBar } from "./ui";

const GRADE_LABEL: Record<Grade, { en: string; tr: string; cls: string }> = {
  again: { en: "Again", tr: "Tekrar", cls: "border-bad text-bad" },
  hard: { en: "Hard", tr: "Zor", cls: "border-warn text-warn" },
  good: { en: "Good", tr: "İyi", cls: "border-good text-good" },
  easy: { en: "Easy", tr: "Kolay", cls: "border-sea text-sea" },
};

interface QueueItem extends ReviewItem {
  key: string;
  isNew: boolean;
  relearn?: boolean;
}

export function ReviewSession({ due, fresh }: { due: ReviewItem[]; fresh: ReviewItem[] }) {
  // Interleave new cards among the reviews (1 new after every 3 reviews).
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
  const [stats, setStats] = useState({ correct: 0, almost: 0, wrong: 0 });
  const [busy, setBusy] = useState(false);

  const item = queue[pos];
  const total = initial.length;
  const done = !item;

  if (!total) {
    return (
      <div className="card text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-2 text-xl font-bold">Nothing due · Hepsi tamam</h2>
        <p className="mt-1 text-muted">No reviews due and today&apos;s new words are done. Come back tomorrow — or train suffixes.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/gym" className="btn-ghost">
            Suffix Gym
          </Link>
          <Link href="/lesson" className="btn-primary">
            Today&apos;s lesson
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    const n = stats.correct + stats.almost + stats.wrong;
    return (
      <div className="card text-center">
        <div className="text-4xl">🏁</div>
        <h2 className="mt-2 text-xl font-bold">Session complete · Tebrikler!</h2>
        <p className="mt-1 text-muted">
          {n} answers · {stats.correct} correct · {stats.almost} almost · {stats.wrong} again
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/" className="btn-ghost">
            Today
          </Link>
          <Link href="/lesson" className="btn-primary">
            Continue to the lesson →
          </Link>
        </div>
      </div>
    );
  }

  const card = item.card;
  const enToTr = item.direction === "en-tr";
  const state = item.state ?? NEW_CARD_STATE;
  const previews = previewIntervals(state);
  const suggested = answer ? suggestGrade(answer.result, answer.ms, (enToTr ? card.tr : card.en).length) : null;

  const grade = async (g: Grade) => {
    if (!answer || busy) return;
    setBusy(true);
    await recordReviewAction({
      cardId: card.id,
      direction: item.direction,
      answer: answer.given,
      result: answer.result,
      msTaken: answer.ms,
      grade: g,
    });
    setStats((s) => ({ ...s, [answer.result]: s[answer.result] + 1 }));
    // "Again" → see it once more at the end of this session.
    const nextQueue = g === "again" ? [...queue, { ...item, key: `${item.key}-r${pos}`, isNew: false, relearn: true, state: { ...state, repetitions: 0 } }] : queue;
    setQueue(nextQueue);
    const next = nextQueue[pos + 1];
    setPos(pos + 1);
    setAnswer(null);
    setPhase(next?.isNew ? "intro" : "test");
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span>
          {Math.min(pos + 1, queue.length)} / {queue.length}
        </span>
        <ProgressBar value={pos} max={queue.length} />
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {item.isNew ? <Badge tone="accent">New word · Yeni</Badge> : null}
          {item.relearn ? <Badge tone="warn">Once more · Bir daha</Badge> : null}
          {card.leech ? <Badge tone="bad">Leech · Zor kelime</Badge> : null}
          {card.source === "correction" ? <Badge tone="warn">From your writing</Badge> : null}
          <Badge>{enToTr ? "English → Turkish" : "Turkish → English"}</Badge>
          <span className="chip">{card.pos}</span>
          {card.unit ? <span className="chip">unit {card.unit}</span> : null}
        </div>

        {phase === "intro" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold">{card.tr}</div>
              <Speak text={card.tr} />
              <Speak text={card.tr} slow />
            </div>
            <div className="text-xl">{card.en}</div>
            {card.exTr ? (
              <div className="rounded-xl bg-card-2 p-3">
                <div className="flex items-center gap-2">
                  {card.exTr} <Speak text={card.exTr} />
                </div>
                <div className="text-sm text-muted">{card.exEn}</div>
              </div>
            ) : null}
            {card.note ? <p className="text-sm text-muted">💡 {card.note}</p> : null}
            <button className="btn-primary" autoFocus onClick={() => setPhase("test")}>
              Got it — test me · Hadi →
            </button>
          </div>
        ) : (
          <>
            <div>
              <div className="text-xs tracking-wide text-muted uppercase">{enToTr ? "Type the Turkish for" : "What does this mean?"}</div>
              <div className="mt-1 flex items-center gap-3 text-2xl font-bold sm:text-3xl">
                {enToTr ? card.en : card.tr}
                {!enToTr ? <Speak text={card.tr} /> : null}
              </div>
            </div>
            <TypeAnswer key={item.key} resetKey={item.key} expected={enToTr ? card.tr : card.en} lang={enToTr ? "tr" : "en"} onChecked={setAnswer}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card-2 p-3">
                  <span className="text-lg font-semibold">{card.tr}</span>
                  <Speak text={card.tr} />
                  <span className="text-muted">= {card.en}</span>
                </div>
                {card.exTr ? (
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      {card.exTr} <Speak text={card.exTr} />
                    </div>
                    <div className="text-muted">{card.exEn}</div>
                  </div>
                ) : null}
                {card.note ? <p className="text-sm text-muted">💡 {card.note}</p> : null}
                <div>
                  <div className="mb-1.5 text-xs text-muted">How was it? (suggested from accuracy + speed) · Nasıldı?</div>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADES.map((g) => (
                      <button
                        key={g}
                        disabled={busy}
                        onClick={() => grade(g)}
                        className={`btn border bg-card flex-col !gap-0 px-1 py-2 ${GRADE_LABEL[g].cls} ${suggested === g ? "ring-2 ring-current" : ""}`}
                        autoFocus={suggested === g}
                      >
                        <span>{GRADE_LABEL[g].en}</span>
                        <span className="text-[11px] font-normal opacity-80">
                          {GRADE_LABEL[g].tr} · {previews[g]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TypeAnswer>
          </>
        )}
      </div>
    </div>
  );
}
