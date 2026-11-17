"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PoolWord } from "@/lib/srs/stage";
import { LADDER, letterHint, type Exercise } from "@/lib/srs/ladder";
import { alternatives, checkTurkish } from "@/lib/turkish/answer";
import { normalizeAnswer } from "@/lib/turkish/text";
import { IconCheck, IconX } from "./icons";
import { Speak } from "./speech";
import { TypeAnswer, type AnswerResult } from "./type-answer";
import { Prompt, RESULT_COPY } from "./ui";

export interface ExerciseCard {
  id: number;
  tr: string;
  en: string;
  pos: string;
  unit: number;
}

// ---------------------------------------------------------------- helpers

/** Small seeded RNG so options don't reshuffle on every render. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const firstForm = (s: string) => alternatives(s)[0] ?? s;
const gloss = (en: string) => normalizeAnswer(en.split(/[/;(]/)[0]);

/** Meanings close enough that offering both as choices would be unfair. */
const SYNONYMS = [
  ["hi", "hello"],
  ["bye", "goodbye", "see you"],
  ["sorry", "excuse me", "pardon"],
  ["ok", "okay", "all right", "fine"],
  ["thanks", "thank you"],
];
const STOP = new Set(["informal", "formal", "polite", "plural", "there", "which", "about", "something", "someone"]);
const stems = (en: string) =>
  new Set(
    normalizeAnswer(en.replace(/\(.*?\)/g, " "))
      .split(/[^a-zçğıöşü]+/)
      .filter((w) => w.length >= 5 && !STOP.has(w))
      .map((w) => w.slice(0, 5)),
  );
function tooClose(a: string, b: string): boolean {
  const sa = stems(a);
  for (const x of stems(b)) if (sa.has(x)) return true;
  const na = normalizeAnswer(a);
  const nb = normalizeAnswer(b);
  return SYNONYMS.some((g) => g.some((w) => na.includes(w)) && g.some((w) => nb.includes(w)));
}

/** Three plausible wrong answers: same kind of word, nearby unit, clearly different meaning. */
function options(card: ExerciseCard, pool: PoolWord[], field: "en" | "tr", seed: number): string[] {
  const r = rng(seed);
  const right = card[field];
  const used = new Set([normalizeAnswer(right), gloss(card.en)]);
  const candidates = pool
    .filter((p) => p.id !== card.id && p[field] && !used.has(normalizeAnswer(p[field])) && !used.has(gloss(p.en)) && !tooClose(card.en, p.en))
    .map((p) => ({ p, score: (p.pos === card.pos ? 0 : 1.5) + Math.abs(p.unit - card.unit) / 4 + r() * 1.2 }))
    .sort((a, b) => a.score - b.score);
  const picks: string[] = [];
  for (const { p } of candidates) {
    const v = p[field];
    const k = normalizeAnswer(v);
    if (picks.some((x) => normalizeAnswer(x) === k || gloss(x) === gloss(v))) continue;
    picks.push(v);
    if (picks.length === 3) break;
  }
  return shuffle([right, ...picks], r);
}

// ---------------------------------------------------------------- ladder indicator

export function LadderSteps({ exercise }: { exercise: Exercise }) {
  const at = LADDER.indexOf(exercise);
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Level ${at + 1} of ${LADDER.length}`} title={`Level ${at + 1} of ${LADDER.length}`}>
      {LADDER.map((e, i) => (
        <span key={e} className={`h-1.5 w-4 rounded-full ${i <= at ? "bg-accent" : "bg-line-strong"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- result bar

function ResultSheet({
  result,
  answerText,
  details,
  children,
}: {
  result: AnswerResult | null;
  answerText?: string;
  details?: React.ReactNode;
  children: React.ReactNode;
}) {
  const copy = result ? RESULT_COPY[result.result] : null;
  return (
    <>
      <div className="h-44" aria-hidden="true" />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] ${copy ? `${copy.tint} border-transparent` : "border-line bg-paper/95 backdrop-blur"}`}
        style={copy ? { animation: "sheet-up 260ms cubic-bezier(0.22, 1, 0.36, 1)" } : undefined}
      >
        <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          {result && copy ? (
            <div className="flex min-w-0 items-start gap-3" role="status" aria-live="polite">
              <span className={`mt-0.5 grid h-7 w-7 shrink-0 animate-pop place-items-center rounded-full ${copy.dot} text-white`}>
                {result.result === "wrong" ? <IconX size={16} /> : <IconCheck size={16} />}
              </span>
              <div className="min-w-0">
                <p className={`font-display text-[21px] leading-tight font-semibold ${copy.text}`}>
                  {copy.title}
                  <span className="ml-2 text-[15px] font-normal opacity-75" lang="tr">
                    {copy.tr}
                  </span>
                </p>
                {result.result !== "correct" && answerText ? (
                  <p className="mt-1 text-ink-soft">
                    The answer is <span className="tr-word text-ink">{answerText}</span>
                  </p>
                ) : null}
                {details ? <div className="mt-3 text-ink">{details}</div> : null}
              </div>
            </div>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex shrink-0 flex-wrap justify-end gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- choose

function Choose({
  card,
  pool,
  field,
  onChecked,
  result,
  details,
  children,
}: {
  card: ExerciseCard;
  pool: PoolWord[];
  field: "en" | "tr";
  onChecked: (r: AnswerResult) => void;
  result: AnswerResult | null;
  details?: React.ReactNode;
  children: React.ReactNode;
}) {
  const opts = useMemo(() => options(card, pool, field, card.id * 31 + (field === "tr" ? 7 : 3)), [card, pool, field]);
  const [picked, setPicked] = useState<number | null>(null);
  const started = useRef(Date.now());
  const right = card[field];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = normalizeAnswer(opts[i]) === normalizeAnswer(right);
    onChecked({ result: ok ? "correct" : "wrong", expected: right, given: opts[i], ms: Date.now() - started.current, reason: ok ? undefined : "wrong" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picked !== null) return;
      const n = Number(e.key);
      if (n >= 1 && n <= opts.length) choose(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, opts]);

  return (
    <>
      <ul className="stagger grid gap-2.5 sm:grid-cols-2" role="list">
        {opts.map((o, i) => {
          const isRight = normalizeAnswer(o) === normalizeAnswer(right);
          const state = picked === null ? "idle" : isRight ? "right" : picked === i ? "wrong" : "dim";
          return (
            <li key={o} style={{ "--i": i } as React.CSSProperties}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={picked !== null}
                lang={field === "tr" ? "tr" : "en"}
                className={`flex min-h-14 w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-[background-color,border-color,opacity,transform] duration-150 ${
                  state === "idle"
                    ? "border-line-strong hover:border-ink-soft hover:bg-haze active:scale-[0.99]"
                    : state === "right"
                      ? "animate-pop border-ok bg-ok-tint"
                      : state === "wrong"
                        ? "animate-shake border-bad bg-bad-tint"
                        : "border-line opacity-50"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[12px] tabular ${
                    state === "right" ? "bg-ok text-white" : state === "wrong" ? "bg-bad text-white" : "border border-line-strong text-muted"
                  }`}
                  aria-hidden="true"
                >
                  {state === "right" ? <IconCheck size={13} /> : state === "wrong" ? <IconX size={13} /> : i + 1}
                </span>
                <span className={field === "tr" ? "tr-word text-[19px]" : "text-[17px]"}>{o}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <ResultSheet result={result} answerText={right} details={details}>
        {result ? children : <span className="text-[14px] text-muted sm:text-right">Tap the right answer, or press 1–{opts.length}.</span>}
      </ResultSheet>
    </>
  );
}

// ---------------------------------------------------------------- build from tiles

function Build({
  card,
  pool,
  onChecked,
  result,
  details,
  children,
}: {
  card: ExerciseCard;
  pool: PoolWord[];
  onChecked: (r: AnswerResult) => void;
  result: AnswerResult | null;
  details?: React.ReactNode;
  children: React.ReactNode;
}) {
  const answer = firstForm(card.tr);
  const tiles = useMemo(() => {
    const r = rng(card.id * 17 + 5);
    const words = answer.split(/\s+/).filter(Boolean);
    const have = new Set(words.map((w) => normalizeAnswer(w)));
    const extras: string[] = [];
    for (const p of shuffle(pool, r)) {
      for (const w of firstForm(p.tr).split(/\s+/)) {
        const k = normalizeAnswer(w);
        if (k && !have.has(k) && !extras.some((e) => normalizeAnswer(e) === k)) extras.push(w);
        if (extras.length >= (words.length <= 3 ? 2 : 3)) break;
      }
      if (extras.length >= (words.length <= 3 ? 2 : 3)) break;
    }
    return shuffle([...words, ...extras], r).map((w, i) => ({ id: i, w }));
  }, [card, pool, answer]);
  const [placed, setPlaced] = useState<number[]>([]);
  const started = useRef(Date.now());
  const done = !!result;

  const check = () => {
    const given = placed.map((i) => tiles[i].w).join(" ");
    const out = checkTurkish(given, alternatives(card.tr), { typoTolerance: false });
    onChecked({ ...out, given, ms: Date.now() - started.current });
  };

  return (
    <>
      <div
        className={`flex min-h-16 flex-wrap items-center gap-2 border-b-2 pb-3 ${done ? (result?.result === "correct" ? "border-ok" : "border-bad") : "border-line-strong"}`}
        aria-label="Your answer"
      >
        {placed.length ? (
          placed.map((ti) => (
            <button
              key={ti}
              type="button"
              disabled={done}
              onClick={() => setPlaced((p) => p.filter((x) => x !== ti))}
              className="tr-word animate-pop rounded-[10px] border border-ink bg-paper px-3 py-2 text-[19px]"
              lang="tr"
            >
              {tiles[ti].w}
            </button>
          ))
        ) : (
          <span className="text-[15px] text-muted">Tap the words in the right order</span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {tiles.map((t) => {
          const used = placed.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              disabled={used || done}
              onClick={() => setPlaced((p) => [...p, t.id])}
              className={`tr-word rounded-[10px] border px-3 py-2 text-[19px] transition-[opacity,transform,background-color] duration-150 ${
                used ? "border-dashed border-line-strong text-transparent" : "border-line-strong hover:bg-haze active:scale-95"
              }`}
              lang="tr"
              aria-hidden={used}
            >
              {t.w}
            </button>
          );
        })}
      </div>
      <ResultSheet result={result} answerText={answer} details={details}>
        {result ? (
          children
        ) : (
          <>
            <button type="button" className="btn-quiet" onClick={() => setPlaced([])} disabled={!placed.length}>
              Clear
            </button>
            <button type="button" className="btn-primary sm:w-40" onClick={check} disabled={!placed.length}>
              Check
            </button>
          </>
        )}
      </ResultSheet>
    </>
  );
}

// ---------------------------------------------------------------- the exercise

/**
 * One review question at the right level of the ladder. Renders the prompt, the answer area
 * and the bottom bar; `children` are the actions shown after answering (e.g. Continue).
 */
export function CardExercise({
  exercise,
  card,
  direction,
  pool,
  label,
  onChecked,
  result,
  details,
  showLadder = true,
  children,
}: {
  exercise: Exercise;
  card: ExerciseCard;
  direction: "en-tr" | "tr-en";
  pool: PoolWord[];
  /** Overrides the prompt label (e.g. "A recent mistake"). */
  label?: string;
  onChecked: (r: AnswerResult) => void;
  result: AnswerResult | null;
  details?: React.ReactNode;
  showLadder?: boolean;
  children: React.ReactNode;
}) {
  const showTurkish = exercise === "choose-meaning" || (exercise === "type" && direction === "tr-en");
  const promptLabel =
    exercise === "choose-meaning"
      ? "What does this mean?"
      : exercise === "choose-turkish"
        ? "Which is the Turkish for"
        : exercise === "build"
          ? "Build the Turkish for"
          : showTurkish
            ? "What does this mean in English?"
            : "Write this in Turkish";

  return (
    <>
      <div key={`${card.id}-${exercise}`} className="animate-slide-in">
        <Prompt
          label={
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>{label ? `${label}. ${promptLabel}` : promptLabel}</span>
              {showLadder ? <LadderSteps exercise={exercise} /> : null}
            </span>
          }
        >
          <div className="flex items-start justify-between gap-4">
            <p
              className={showTurkish ? "display-xl text-[48px] sm:text-[60px]" : "font-display text-[33px] leading-tight font-medium sm:text-[42px]"}
              lang={showTurkish ? "tr" : "en"}
            >
              {showTurkish ? card.tr : card.en}
            </p>
            {showTurkish ? <Speak text={firstForm(card.tr)} size="lg" className="mt-1" /> : null}
          </div>
          {exercise === "type-hint" ? (
            <p className="font-display mt-3 text-[21px] tracking-[0.06em] text-ink-soft" lang="tr" aria-label={`Starts with ${firstForm(card.tr).charAt(0)}`}>
              {letterHint(card.tr)}
            </p>
          ) : null}
        </Prompt>
      </div>

      {exercise === "choose-meaning" ? (
        <Choose key={card.id} card={card} pool={pool} field="en" onChecked={onChecked} result={result} details={details}>
          {children}
        </Choose>
      ) : exercise === "choose-turkish" ? (
        <Choose key={card.id} card={card} pool={pool} field="tr" onChecked={onChecked} result={result} details={details}>
          {children}
        </Choose>
      ) : exercise === "build" ? (
        <Build key={card.id} card={card} pool={pool} onChecked={onChecked} result={result} details={details}>
          {children}
        </Build>
      ) : (
        <TypeAnswer
          key={card.id}
          resetKey={`${card.id}-${exercise}`}
          expected={showTurkish ? card.en : card.tr}
          lang={showTurkish ? "en" : "tr"}
          onChecked={onChecked}
          sheet="fixed"
          details={details}
        >
          {children}
        </TypeAnswer>
      )}
    </>
  );
}
