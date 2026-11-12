"use client";

import { useEffect, useState } from "react";
import { ALPHABET, SPELL_WORDS } from "@/lib/alphabet";
import { Simit } from "./simit";
import { Speak, useSpeech } from "./speech";
import { TypeAnswer, type AnswerResult } from "./type-answer";
import { SpeechBubble } from "./ui";

export function AlphabetModule() {
  const { speak, available } = useSpeech();
  const [sel, setSel] = useState(ALPHABET.findIndex((l) => l.lower === "ç"));
  const [onlySpecial, setOnlySpecial] = useState(false);
  const letter = ALPHABET[sel];
  const letters = onlySpecial ? ALPHABET.filter((l) => l.special) : ALPHABET;

  return (
    <div className="space-y-12">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-extrabold">The 29 letters</h2>
            <button className="btn-quiet" onClick={() => setOnlySpecial((v) => !v)} aria-pressed={onlySpecial}>
              {onlySpecial ? "Show all letters" : "Only the tricky ones"}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-6 md:grid-cols-8">
            {letters.map((l) => {
              const idx = ALPHABET.indexOf(l);
              const on = idx === sel;
              return (
                <button
                  key={l.upper}
                  onClick={() => {
                    setSel(idx);
                    speak(l.example);
                  }}
                  aria-pressed={on}
                  aria-label={`${l.upper}, ${l.sound}`}
                  className={`font-display relative grid aspect-square place-items-center rounded-2xl border-2 text-2xl font-extrabold transition-transform active:translate-y-1 ${
                    on
                      ? "border-kobalt bg-kobalt text-white shadow-[0_4px_0_var(--kobalt-depth)]"
                      : l.special
                        ? "border-cay bg-cay-tint text-cay-depth shadow-[0_4px_0_var(--cay)]"
                        : "border-line bg-paper text-ink shadow-[0_4px_0_var(--line)]"
                  }`}
                >
                  <span>
                    {l.upper}
                    <span className="text-xl font-bold opacity-75">{l.lower}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted">Orange letters behave differently from English. Tap any letter to hear an example.</p>
        </div>

        <aside className="self-start rounded-3xl border-2 border-line p-5 lg:sticky lg:top-8">
          <div className="flex items-end gap-4">
            <span className="font-display text-7xl leading-none font-extrabold text-kobalt">
              {letter.upper}
              {letter.lower}
            </span>
            <span className="pb-2 text-muted">name: “{letter.name}”</span>
          </div>
          <p className="mt-4 text-xl">{letter.sound}</p>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-wash p-3">
            <Speak text={letter.example} />
            <span>
              <span className="tr-word block text-2xl leading-tight" lang="tr">
                {letter.example}
              </span>
              <span className="text-sm text-ink-soft">{letter.exampleEn}</span>
            </span>
            <Speak text={letter.example} slow className="ml-auto" />
          </div>
          {letter.tip ? <p className="mt-4 text-ink-soft">{letter.tip}</p> : null}
        </aside>
      </section>

      <section className="rounded-3xl bg-wash p-5 sm:p-7">
        <h2 className="font-display text-2xl font-extrabold">Vowel harmony</h2>
        <p className="mt-1 max-w-[60ch] text-ink-soft">
          Turkish suffixes copy the last vowel of the word. Learn these two groupings now — every ending you&apos;ll ever add depends on them.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-paper p-5">
            <h3 className="font-display text-lg font-extrabold">Two-way: a or e</h3>
            <div className="mt-3 space-y-2">
              {[
                { v: ["a", "ı", "o", "u"], out: "a", ex: "okul", sfx: "da", tone: "bg-kobalt-tint text-kobalt" },
                { v: ["e", "i", "ö", "ü"], out: "e", ex: "ev", sfx: "de", tone: "bg-turkuaz-tint text-turkuaz-depth" },
              ].map((r) => (
                <div key={r.out} className="flex items-center gap-2">
                  {r.v.map((x) => (
                    <span key={x} className={`font-display grid h-10 w-10 place-items-center rounded-xl text-xl font-extrabold ${r.tone}`}>
                      {x}
                    </span>
                  ))}
                  <span className="mx-1 text-muted">take</span>
                  <span className="font-display text-xl font-extrabold">-{r.out}</span>
                  <span className="ml-auto text-ink-soft" lang="tr">
                    {r.ex}
                    <b className="text-ink">{r.sfx}</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-paper p-5">
            <h3 className="font-display text-lg font-extrabold">Four-way: ı, i, u or ü</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { v: "a ı", out: "ı", ex: "kız", sfx: "ı" },
                { v: "e i", out: "i", ex: "ev", sfx: "i" },
                { v: "o u", out: "u", ex: "okul", sfx: "u" },
                { v: "ö ü", out: "ü", ex: "göz", sfx: "ü" },
              ].map((r) => (
                <div key={r.out} className="flex items-center justify-between rounded-2xl bg-wash px-3 py-2">
                  <span className="font-display text-lg font-bold">
                    {r.v} <span className="text-muted">→</span> {r.out}
                  </span>
                  <span className="text-ink-soft" lang="tr">
                    {r.ex}
                    <b className="text-ink">{r.sfx}</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          Dotted and undotted i are different letters: İ i (iyi, İskele) and I ı (ılık). The app always uses Turkish casing, so a capital I is ı.
        </p>
      </section>

      <SpellDrill available={available} />
    </div>
  );
}

function SpellDrill({ available }: { available: boolean }) {
  const { speak } = useSpeech();
  const [order, setOrder] = useState(SPELL_WORDS);
  // Shuffle on the client only (avoids a server/client hydration mismatch).
  useEffect(() => setOrder([...SPELL_WORDS].sort(() => Math.random() - 0.5)), []);
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ c: 0, n: 0 });
  const [ans, setAns] = useState<AnswerResult | null>(null);
  const [mode, setMode] = useState<"listen" | "read">(available ? "listen" : "read");
  const w = order[i % order.length];
  const m = available ? mode : "read";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Listen and spell</h2>
          <p className="text-muted" lang="tr">
            Dinle ve yaz — {score.c} of {score.n} right so far
          </p>
        </div>
        {available ? (
          <div className="flex rounded-2xl border-2 border-line p-1" role="tablist">
            {(["listen", "read"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={m === k}
                onClick={() => setMode(k)}
                className={`font-display rounded-xl px-3 py-1 font-bold ${m === k ? "bg-kobalt text-white" : "text-ink-soft"}`}
              >
                {k === "listen" ? "Listen" : "Sound it out"}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="rounded-3xl border-2 border-line p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <Simit size={96} className="shrink-0" mood={ans ? (ans.result === "wrong" ? "oops" : "happy") : "calm"} />
          <SpeechBubble className="flex-1">
            {m === "listen" ? (
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn-primary !min-h-11" onClick={() => speak(w.tr, 0.8)}>
                  Play the word
                </button>
                <button className="btn-quiet" onClick={() => speak(w.tr, 0.55)}>
                  Slower
                </button>
                <span className="text-sm text-muted">It means “{w.en}”.</span>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted">It sounds roughly like</p>
                <p className="font-display text-2xl font-extrabold">“{w.say}”</p>
                <p className="text-sm text-muted">and means “{w.en}”.</p>
              </div>
            )}
          </SpeechBubble>
        </div>
        <TypeAnswer
          key={i}
          resetKey={i}
          expected={w.tr}
          strict
          autoFocus={false}
          onChecked={(r) => {
            setAns(r);
            setScore((s) => ({ c: s.c + (r.result === "correct" ? 1 : 0), n: s.n + 1 }));
          }}
        >
          <button
            className={ans?.result === "correct" ? "btn-success sm:w-44" : ans?.result === "almost" ? "btn-cay sm:w-44" : "btn-danger sm:w-44"}
            autoFocus
            onClick={() => {
              setAns(null);
              setI(i + 1);
            }}
          >
            Next word
          </button>
        </TypeAnswer>
      </div>
      {!available ? (
        <p className="mt-3 text-sm text-muted">No Turkish voice is installed on this device, so audio is hidden. Settings explains how to add one.</p>
      ) : null}
    </section>
  );
}
