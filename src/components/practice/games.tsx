"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { numberToTurkish, timeToTurkish } from "@/lib/practice/numbers";
import { inflectNoun, questionParticle, type NounEntry } from "@/lib/turkish/nouns";
import { lastVowel } from "@/lib/turkish/phonology";
import { normalizeAnswer } from "@/lib/turkish/text";
import { Speak, useSpeech } from "../speech";
import { Choices, Feedback, GameBar, GameOver, distinctBy, firstForm, rand, shuffle, type GameWord } from "./shared";

// ======================================================================= 1. Match pairs

const PAIRS = 6;
const BOARDS = 3;

export function MatchGame({ words, best }: { words: GameWord[]; best?: number }) {
  const [game, setGame] = useState(0);
  const boards = useMemo(() => {
    const pool = distinctBy(shuffle(words), (w) => w.en.split(/[/;(]/)[0], PAIRS * BOARDS + 6);
    return Array.from({ length: BOARDS }, (_, b) => pool.slice(b * PAIRS, b * PAIRS + PAIRS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, game]);
  const [board, setBoard] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<{ tr?: number; en?: number }>({});
  const [wrong, setWrong] = useState<{ tr?: number; en?: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [over, setOver] = useState(false);

  const cards = boards[board] ?? [];
  const left = useMemo(() => shuffle(cards.map((c) => c.id)), [cards]);
  const right = useMemo(() => shuffle(cards.map((c) => c.id)), [cards]);
  useEffect(() => {
    if (over) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [over]);
  const secs = Math.round((now - start) / 1000);

  const choose = (side: "tr" | "en", id: number) => {
    if (done.has(id) || wrong) return;
    const next = { ...sel, [side]: id };
    if (next.tr !== undefined && next.en !== undefined) {
      if (next.tr === next.en) {
        const d = new Set(done).add(id);
        setDone(d);
        setSel({});
        if (d.size === cards.length) {
          if (board + 1 >= BOARDS) {
            setNow(Date.now());
            setOver(true);
          } else
            setTimeout(() => {
              setBoard(board + 1);
              setDone(new Set());
            }, 450);
        }
      } else {
        setWrong(next);
        setMistakes((m) => m + 1);
        setTimeout(() => {
          setWrong(null);
          setSel({});
        }, 650);
      }
    } else setSel(next);
  };

  const score = Math.max(0, 300 - secs - mistakes * 10);
  if (over)
    return (
      <GameOver
        id="match"
        score={score}
        detail={`${secs} seconds, ${mistakes} mistake${mistakes === 1 ? "" : "s"}`}
        onAgain={() => {
          setGame(game + 1);
          setBoard(0);
          setDone(new Set());
          setMistakes(0);
          setStart(Date.now());
          setNow(Date.now());
          setOver(false);
        }}
      />
    );

  const tile = (side: "tr" | "en", id: number) => {
    const c = cards.find((x) => x.id === id)!;
    const isDone = done.has(id);
    const isSel = sel[side] === id;
    const isWrong = wrong?.[side] === id;
    return (
      <button
        key={`${side}-${id}`}
        type="button"
        onClick={() => choose(side, id)}
        disabled={isDone}
        lang={side}
        className={`min-h-14 w-full rounded-[12px] border px-3 py-2.5 text-left transition-[background-color,border-color,opacity,transform] duration-200 ${
          isDone
            ? "scale-95 border-transparent bg-ok-tint text-ok-text opacity-0"
            : isWrong
              ? "animate-shake border-bad bg-bad-tint"
              : isSel
                ? "border-brand bg-brand-tint"
                : "border-line-strong hover:bg-haze active:scale-[0.98]"
        }`}
      >
        <span className={side === "tr" ? "tr-word text-[18px]" : "text-[15px]"}>{side === "tr" ? firstForm(c.tr) : c.en}</span>
      </button>
    );
  };

  return (
    <div>
      <GameBar value={board * PAIRS + done.size} max={BOARDS * PAIRS} score={score} best={best} />
      <p className="mb-4 text-[15px] text-muted">
        Board {board + 1} of {BOARDS}. Tap a Turkish word, then its meaning. {secs}s
      </p>
      <div key={board} className="grid animate-rise grid-cols-2 gap-2.5">
        <div className="space-y-2.5">{left.map((id) => tile("tr", id))}</div>
        <div className="space-y-2.5">{right.map((id) => tile("en", id))}</div>
      </div>
    </div>
  );
}

// ======================================================================= 2. Harmony hunter

type Kind = "plural" | "loc" | "abl" | "dat" | "acc" | "my" | "question";
const KIND_LABEL: Record<Kind, { add: string; en: (g: string) => string }> = {
  plural: { add: "plural (-lar / -ler)", en: (g) => `${g}s` },
  loc: { add: "in / at (-da / -de / -ta / -te)", en: (g) => `in the ${g}` },
  abl: { add: "from (-dan / -den / -tan / -ten)", en: (g) => `from the ${g}` },
  dat: { add: "to (-a / -e)", en: (g) => `to the ${g}` },
  acc: { add: "the (object: -ı / -i / -u / -ü)", en: (g) => `the ${g} (object)` },
  my: { add: "my (-ım / -im / -um / -üm)", en: (g) => `my ${g}` },
  question: { add: "question (mı / mi / mu / mü)", en: (g) => `a ${g}?` },
};
const ROUNDS = 12;

function variants(suffix: string, kind: Kind): string[] {
  const out = new Set<string>([suffix]);
  const four = ["ı", "i", "u", "ü"];
  if (kind === "acc" || kind === "my" || kind === "question") {
    for (const v of four) out.add(suffix.replace(/[ıiuü]/g, v));
  } else {
    const swapAE = suffix.replace(/[ae]/g, (c) => (c === "a" ? "e" : "a"));
    out.add(swapAE);
    if (/^[dt]/.test(suffix)) {
      const swapDT = suffix.replace(/^[dt]/, (c) => (c === "d" ? "t" : "d"));
      out.add(swapDT);
      out.add(swapDT.replace(/[ae]/g, (c) => (c === "a" ? "e" : "a")));
    }
    if (kind === "dat") {
      out.add(suffix.startsWith("y") ? suffix.slice(1) : "y" + suffix);
      out.add((suffix.startsWith("y") ? suffix.slice(1) : "y" + suffix).replace(/[ae]/g, (c) => (c === "a" ? "e" : "a")));
    }
  }
  return [...out];
}

export function HarmonyGame({ nouns, best }: { nouns: (NounEntry & { en: string })[]; best?: number }) {
  const make = useCallback(() => {
    const n = rand(nouns);
    const kinds: Kind[] = ["plural", "loc", "abl", "dat", "acc", "my", "question"];
    const kind = rand(kinds);
    let answer: string;
    let root: string;
    let suffix: string;
    if (kind === "question") {
      const q = questionParticle(n.word, n.harmonyOverride);
      answer = `${n.word} ${q}`;
      root = `${n.word} `;
      suffix = q;
    } else {
      const spec = kind === "plural" ? { plural: true } : kind === "my" ? { possessive: "1sg" as const } : { case: kind };
      const r = inflectNoun(n, spec);
      answer = r.form;
      root = r.parts[0];
      suffix = r.parts.slice(1).join("");
    }
    const opts = shuffle(variants(suffix, kind).slice(0, kind === "plural" ? 2 : 4).map((s) => root + s));
    if (!opts.includes(answer)) opts[0] = answer;
    return { n, kind, answer, options: shuffle([...new Set(opts)]) };
  }, [nouns]);
  const [i, setI] = useState(0);
  const [q, setQ] = useState(make);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  const gloss = q.n.en.split(/\s*[/;]\s*/)[0].replace(/\(.*?\)/g, "").trim();
  const lv = lastVowel(q.n.word, q.n.harmonyOverride);

  if (over)
    return (
      <GameOver
        id="harmony"
        score={score}
        onAgain={() => {
          setI(0);
          setScore(0);
          setStreak(0);
          setPicked(null);
          setQ(make());
          setOver(false);
        }}
      />
    );

  const ok = picked !== null && normalizeAnswer(picked) === normalizeAnswer(q.answer);
  return (
    <div>
      <GameBar value={i} max={ROUNDS} score={score} best={best} />
      <div key={i} className="animate-slide-in">
        <p className="text-[15px] text-muted">
          Add <b className="font-medium text-ink">{KIND_LABEL[q.kind].add}</b>
        </p>
        <p className="display-xl mt-2 text-[56px]" lang="tr">
          {q.n.word}
        </p>
        <p className="mt-1 mb-8 text-[17px] text-ink-soft">“{KIND_LABEL[q.kind].en(gloss)}”</p>
        <Choices
          options={q.options}
          answer={q.answer}
          picked={picked}
          onPick={(o) => {
            setPicked(o);
            const right = normalizeAnswer(o) === normalizeAnswer(q.answer);
            setScore((s) => s + (right ? 10 + (streak >= 2 ? 5 : 0) : 0));
            setStreak((x) => (right ? x + 1 : 0));
          }}
        />
      </div>
      {picked !== null ? (
        <Feedback
          ok={ok}
          last={i + 1 >= ROUNDS}
          text={
            <>
              <span className="tr-word">{q.answer}</span>. Last vowel <b>{lv || "–"}</b>
              {q.kind !== "plural" && /[fstkçşhp]$/.test(q.n.word) && /^(da|de|dan|den|ta|te|tan|ten)$/.test(q.answer.slice(q.n.word.length)) ? ", and a hard consonant turns d into t" : ""}.
              {streak >= 3 ? ` Streak ${streak}!` : ""}
            </>
          }
          onNext={() => {
            if (i + 1 >= ROUNDS) setOver(true);
            else {
              setI(i + 1);
              setPicked(null);
              setQ(make());
            }
          }}
        />
      ) : null}
    </div>
  );
}

// ======================================================================= 3. Numbers

const LEVELS = [
  { max: 20, label: "0–20" },
  { max: 100, label: "up to 100" },
  { max: 1000, label: "up to 1,000" },
  { max: 10000, label: "up to 10,000" },
];

export function NumbersGame({ best }: { best?: number }) {
  const [level, setLevel] = useState<number | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const max = level === null ? 20 : LEVELS[level].max;
  const make = useCallback(() => {
    const n = Math.floor(Math.random() * (max + 1));
    const near = new Set<number>([n]);
    while (near.size < 4) {
      const d = Math.max(1, Math.round(max / 25));
      const c = Math.max(0, Math.min(max, n + (Math.floor(Math.random() * 7) - 3) * d + (Math.random() < 0.4 ? 10 : 0)));
      near.add(c);
    }
    const toWords = Math.random() < 0.55;
    return { n, toWords, options: shuffle([...near]).map((x) => (toWords ? numberToTurkish(x) : x.toLocaleString("en-GB"))) };
  }, [max]);
  const [q, setQ] = useState(make);

  if (level === null)
    return (
      <div>
        <p className="mb-4 text-[17px] text-ink-soft">Choose how big the numbers get.</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {LEVELS.map((l, k) => (
            <button
              key={l.label}
              className="rounded-[12px] border border-line-strong px-4 py-4 text-left transition-colors hover:bg-haze"
              onClick={() => {
                setLevel(k);
                setTimeout(() => setQ(make()), 0);
              }}
            >
              <span className="font-display text-[21px] font-semibold">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    );

  if (over)
    return (
      <GameOver
        id="numbers"
        score={score}
        detail={LEVELS[level].label}
        onAgain={() => {
          setI(0);
          setScore(0);
          setPicked(null);
          setQ(make());
          setOver(false);
        }}
      />
    );

  const answer = q.toWords ? numberToTurkish(q.n) : q.n.toLocaleString("en-GB");
  return (
    <div>
      <GameBar value={i} max={ROUNDS} score={score} best={best} />
      <div key={i} className="animate-slide-in">
        <p className="text-[15px] text-muted">{q.toWords ? "How do you say this number?" : "Which number is this?"}</p>
        <div className="mt-2 mb-8 flex items-center justify-between gap-4">
          <p className={q.toWords ? "display-xl text-[72px] tabular" : "tr-word text-[33px] leading-tight"} lang={q.toWords ? undefined : "tr"}>
            {q.toWords ? q.n.toLocaleString("en-GB") : numberToTurkish(q.n)}
          </p>
          {!q.toWords ? <Speak text={numberToTurkish(q.n)} size="lg" /> : null}
        </div>
        <Choices
          options={q.options}
          answer={answer}
          picked={picked}
          lang={q.toWords ? "tr" : "en"}
          cols={q.toWords ? 1 : 2}
          onPick={(o) => {
            setPicked(o);
            if (normalizeAnswer(o) === normalizeAnswer(answer)) setScore((s) => s + 10);
          }}
        />
      </div>
      {picked !== null ? (
        <Feedback
          ok={normalizeAnswer(picked) === normalizeAnswer(answer)}
          last={i + 1 >= ROUNDS}
          text={
            <>
              {q.n.toLocaleString("en-GB")} = <span className="tr-word">{numberToTurkish(q.n)}</span>
            </>
          }
          onNext={() => {
            if (i + 1 >= ROUNDS) setOver(true);
            else {
              setI(i + 1);
              setPicked(null);
              setQ(make());
            }
          }}
        />
      ) : null}
    </div>
  );
}

// ======================================================================= 4. Clock

function Clock({ h, m }: { h: number; m: number }) {
  const ma = (m / 60) * 360;
  const ha = ((h % 12) / 12) * 360 + (m / 60) * 30;
  return (
    <svg viewBox="0 0 120 120" className="h-44 w-44" role="img" aria-label={`${h}:${String(m).padStart(2, "0")}`}>
      <circle cx="60" cy="60" r="56" fill="var(--paper)" stroke="var(--line-strong)" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        return <line key={k} x1={60 + Math.sin(a) * 47} y1={60 - Math.cos(a) * 47} x2={60 + Math.sin(a) * (k % 3 ? 51 : 43)} y2={60 - Math.cos(a) * (k % 3 ? 51 : 43)} stroke="var(--ink-soft)" strokeWidth={k % 3 ? 1.5 : 2.5} strokeLinecap="round" />;
      })}
      <line x1="60" y1="60" x2={60 + Math.sin((ha * Math.PI) / 180) * 28} y2={60 - Math.cos((ha * Math.PI) / 180) * 28} stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      <line x1="60" y1="60" x2={60 + Math.sin((ma * Math.PI) / 180) * 42} y2={60 - Math.cos((ma * Math.PI) / 180) * 42} stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="3.5" fill="var(--ink)" />
    </svg>
  );
}

export function ClockGame({ best }: { best?: number }) {
  const make = useCallback(() => {
    const h = 1 + Math.floor(Math.random() * 12);
    const mins = [0, 15, 30, 45, 0, 15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55];
    const m = rand(mins);
    const opts = new Set([timeToTurkish(h, m)]);
    while (opts.size < 4) {
      const hh = Math.random() < 0.5 ? h : (h % 12) + 1;
      opts.add(timeToTurkish(hh, rand(mins)));
    }
    return { h, m, options: shuffle([...opts]) };
  }, []);
  const [i, setI] = useState(0);
  const [q, setQ] = useState(make);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const answer = timeToTurkish(q.h, q.m);

  if (over)
    return (
      <GameOver
        id="clock"
        score={score}
        onAgain={() => {
          setI(0);
          setScore(0);
          setPicked(null);
          setQ(make());
          setOver(false);
        }}
      />
    );
  return (
    <div>
      <GameBar value={i} max={10} score={score} best={best} />
      <div key={i} className="animate-slide-in">
        <p className="text-[15px] text-muted">Saat kaç? What time is it?</p>
        <div className="mt-3 mb-8 flex items-center gap-6">
          <Clock h={q.h} m={q.m} />
          <p className="font-display text-[40px] font-semibold tabular">
            {q.h}:{String(q.m).padStart(2, "0")}
          </p>
        </div>
        <Choices
          options={q.options}
          answer={answer}
          picked={picked}
          cols={1}
          onPick={(o) => {
            setPicked(o);
            if (o === answer) setScore((s) => s + 10);
          }}
        />
      </div>
      {picked !== null ? (
        <Feedback
          ok={picked === answer}
          last={i + 1 >= 10}
          text={
            <span className="inline-flex items-center gap-2">
              <span className="tr-word">{answer}</span>
              <Speak text={answer} size="sm" />
            </span>
          }
          onNext={() => {
            if (i + 1 >= 10) setOver(true);
            else {
              setI(i + 1);
              setPicked(null);
              setQ(make());
            }
          }}
        />
      ) : null}
    </div>
  );
}

// ======================================================================= 5. Listening

export function ListenGame({ words, best }: { words: GameWord[]; best?: number }) {
  const { speak, available } = useSpeech();
  const make = useCallback(() => {
    const w = rand(words);
    const t = firstForm(w.tr);
    const similar = shuffle(words.filter((x) => x.id !== w.id && normalizeAnswer(firstForm(x.tr)) !== normalizeAnswer(t)))
      .sort((a, b) => Number(firstForm(b.tr)[0] === t[0]) - Number(firstForm(a.tr)[0] === t[0]))
      .slice(0, 3)
      .map((x) => firstForm(x.tr));
    return { w, t, options: shuffle([t, ...similar]) };
  }, [words]);
  const [i, setI] = useState(0);
  const [q, setQ] = useState(make);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (available && !over) {
      const t = setTimeout(() => speak(q.t, 0.85), 300);
      return () => clearTimeout(t);
    }
  }, [q, available, over, speak]);

  if (!available)
    return (
      <p className="rounded-[14px] bg-warn-tint p-5 text-ink">
        This game needs a Turkish voice, and none is installed in this browser. Settings → Voice explains how to add one (it takes a minute).
      </p>
    );
  if (over)
    return (
      <GameOver
        id="listen"
        score={score}
        onAgain={() => {
          setI(0);
          setScore(0);
          setPicked(null);
          setQ(make());
          setOver(false);
        }}
      />
    );
  return (
    <div>
      <GameBar value={i} max={ROUNDS} score={score} best={best} />
      <div key={i} className="animate-slide-in">
        <p className="text-[15px] text-muted">Listen, then pick the word you heard.</p>
        <div className="mt-3 mb-8 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={() => speak(q.t, 0.85)}>
            Play again
          </button>
          <button className="btn-quiet h-11" onClick={() => speak(q.t, 0.55)}>
            Slower
          </button>
        </div>
        <Choices
          options={q.options}
          answer={q.t}
          picked={picked}
          onPick={(o) => {
            setPicked(o);
            if (normalizeAnswer(o) === normalizeAnswer(q.t)) setScore((s) => s + 10);
          }}
        />
      </div>
      {picked !== null ? (
        <Feedback
          ok={normalizeAnswer(picked) === normalizeAnswer(q.t)}
          last={i + 1 >= ROUNDS}
          text={
            <>
              <span className="tr-word">{q.t}</span> means “{q.w.en}”.
            </>
          }
          onNext={() => {
            if (i + 1 >= ROUNDS) setOver(true);
            else {
              setI(i + 1);
              setPicked(null);
              setQ(make());
            }
          }}
        />
      ) : null}
    </div>
  );
}

// ======================================================================= 6. Lightning round

const SECONDS = 60;

export function LightningGame({ words, best }: { words: GameWord[]; best?: number }) {
  const make = useCallback(() => {
    const w = rand(words);
    const others = distinctBy(
      shuffle(words.filter((x) => x.id !== w.id)),
      (x) => x.en.split(/[/;(]/)[0],
      8,
    )
      .filter((x) => normalizeAnswer(x.en.split(/[/;(]/)[0]) !== normalizeAnswer(w.en.split(/[/;(]/)[0]))
      .slice(0, 3)
      .map((x) => x.en);
    return { w, options: shuffle([w.en, ...others]) };
  }, [words]);
  const [started, setStarted] = useState(false);
  const [q, setQ] = useState(make);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const over = started && left <= 0;

  useEffect(() => {
    if (!started || over) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [started, over]);

  if (!started)
    return (
      <div className="py-6">
        <p className="max-w-[52ch] text-[17px] text-ink-soft">Sixty seconds. A Turkish word appears; tap its meaning. As many as you can, as fast as you can. Keys 1–4 work too.</p>
        <button className="btn-primary mt-6" onClick={() => setStarted(true)} autoFocus>
          Start
        </button>
      </div>
    );
  if (over)
    return (
      <GameOver
        id="lightning"
        score={score}
        unit="right in 60 seconds"
        detail={`${answered} answered`}
        onAgain={() => {
          setScore(0);
          setAnswered(0);
          setLeft(SECONDS);
          setPicked(null);
          setQ(make());
        }}
      />
    );
  return (
    <div>
      <GameBar value={SECONDS - left} max={SECONDS} score={score} best={best} timer={left} />
      <div key={answered} className="animate-slide-in">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="display-xl text-[52px]" lang="tr">
            {firstForm(q.w.tr)}
          </p>
        </div>
        <Choices
          options={q.options}
          answer={q.w.en}
          picked={picked}
          lang="en"
          onPick={(o) => {
            setPicked(o);
            setAnswered((a) => a + 1);
            if (o === q.w.en) setScore((s) => s + 1);
            setTimeout(
              () => {
                setPicked(null);
                setQ(make());
              },
              o === q.w.en ? 250 : 700,
            );
          }}
        />
      </div>
    </div>
  );
}
