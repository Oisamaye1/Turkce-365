"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { recordGameAction } from "@/app/actions";
import { normalizeAnswer } from "@/lib/turkish/text";
import { IconCheck, IconX } from "../icons";
import { ProgressBar } from "../ui";

export interface GameWord {
  id: number;
  tr: string;
  en: string;
  pos: string;
  unit: number;
}

export function rand<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

export function shuffle<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const firstForm = (s: string) => s.split(/\s*[/;]\s*/)[0].replace(/\(.*?\)/g, "").trim();

/** Up to `n` items with distinct values of `key`. */
export function distinctBy<T>(xs: readonly T[], key: (x: T) => string, n: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of xs) {
    const k = normalizeAnswer(key(x));
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

/** Top bar for a game: progress through rounds (or time), score, best. */
export function GameBar({ value, max, score, best, timer }: { value: number; max: number; score: number; best?: number; timer?: number }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <ProgressBar value={value} max={max} tone={timer !== undefined && timer <= 10 ? "accent" : "brand"} />
      <span className="shrink-0 text-[14px] text-muted tabular">
        {timer !== undefined ? `${timer}s` : `${Math.min(value + 1, max)} / ${max}`}
      </span>
      <span key={score} className="shrink-0 animate-pop font-display text-[19px] font-semibold tabular">
        {score}
      </span>
      {best ? <span className="hidden shrink-0 text-[13px] text-muted sm:inline">best {best}</span> : null}
    </div>
  );
}

/** Answer buttons that show right and wrong after a pick. */
export function Choices({
  options,
  answer,
  picked,
  onPick,
  lang = "tr",
  cols = 2,
}: {
  options: string[];
  answer: string;
  picked: string | null;
  onPick: (o: string) => void;
  lang?: "tr" | "en";
  cols?: 1 | 2;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picked !== null) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onPick(options[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, picked, onPick]);
  return (
    <ul className={`grid gap-2.5 ${cols === 2 ? "sm:grid-cols-2" : ""}`}>
      {options.map((o, i) => {
        const right = normalizeAnswer(o) === normalizeAnswer(answer);
        const state = picked === null ? "idle" : right ? "right" : picked === o ? "wrong" : "dim";
        return (
          <li key={o}>
            <button
              type="button"
              disabled={picked !== null}
              onClick={() => onPick(o)}
              lang={lang}
              className={`flex min-h-14 w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-[background-color,border-color,opacity,transform] duration-150 ${
                state === "idle"
                  ? "border-line-strong hover:border-ink-soft hover:bg-haze active:scale-[0.99]"
                  : state === "right"
                    ? "animate-pop border-ok bg-ok-tint"
                    : state === "wrong"
                      ? "animate-shake border-bad bg-bad-tint"
                      : "border-line opacity-45"
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
              <span className={lang === "tr" ? "tr-word text-[19px]" : "text-[17px]"}>{o}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** End screen: score, best (saved), play again. */
export function GameOver({ id, score, unit = "points", detail, onAgain }: { id: string; score: number; unit?: string; detail?: string; onAgain: () => void }) {
  const [res, setRes] = useState<{ best: number; isBest: boolean } | null>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    recordGameAction(id, score).then((r) => r && setRes(r));
  }, [id, score]);
  return (
    <div className="animate-rise py-6 text-center">
      <p className="text-[15px] text-muted">{res?.isBest && score > 0 ? "New best!" : "Done"}</p>
      <p className="display-xl mt-2 text-[80px] tabular">{score}</p>
      <p className="text-[17px] text-ink-soft">
        {unit}
        {detail ? `, ${detail}` : ""}
      </p>
      {res && !res.isBest ? <p className="mt-1 text-[14px] text-muted">Your best: {res.best}</p> : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button className="btn-primary" onClick={onAgain} autoFocus>
          Play again
        </button>
        <Link href="/practice" className="btn-secondary">
          Other games
        </Link>
      </div>
    </div>
  );
}

/** Small banner under a question: right/wrong with the answer, and Next. */
export function Feedback({ ok, text, onNext, last }: { ok: boolean; text?: React.ReactNode; onNext: () => void; last?: boolean }) {
  return (
    <div className={`mt-6 flex animate-rise flex-wrap items-center justify-between gap-3 rounded-[12px] p-4 ${ok ? "bg-ok-tint" : "bg-bad-tint"}`} role="status">
      <p className={`font-medium ${ok ? "text-ok-text" : "text-bad-text"}`}>
        {ok ? "Doğru!" : "Not quite."} {text ? <span className="font-normal text-ink">{text}</span> : null}
      </p>
      <button className={ok ? "btn-ok" : "btn-bad"} onClick={onNext} autoFocus>
        {last ? "See score" : "Next"}
      </button>
    </div>
  );
}

/** Render children only in the browser (games shuffle with Math.random, which can't match a server render). */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? <>{children}</> : <div className="h-64" aria-busy="true" />;
}
