"use client";

import { useEffect, useState } from "react";
import { ALPHABET, SPELL_WORDS } from "@/lib/alphabet";
import { Speak, useSpeech } from "./speech";
import { TypeAnswer, type AnswerResult } from "./type-answer";
import { RESULT_COPY } from "./ui";

export function AlphabetModule() {
  const { speak, available } = useSpeech();
  const [sel, setSel] = useState(ALPHABET.findIndex((l) => l.lower === "ç"));
  const [onlySpecial, setOnlySpecial] = useState(false);
  const letter = ALPHABET[sel];
  const letters = onlySpecial ? ALPHABET.filter((l) => l.special) : ALPHABET;

  return (
    <div className="space-y-20">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[26px] font-semibold">The 29 letters</h2>
            <button className="btn-quiet" onClick={() => setOnlySpecial((v) => !v)} aria-pressed={onlySpecial}>
              {onlySpecial ? "Show all letters" : "Only the ones unlike English"}
            </button>
          </div>
          <div className="grid grid-cols-5 border-t border-l border-line sm:grid-cols-6 md:grid-cols-8">
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
                  aria-label={`${l.upper}: ${l.sound}`}
                  className={`relative grid aspect-square place-items-center border-r border-b border-line transition-[background-color,color,transform] duration-150 active:scale-95 ${on ? "bg-ink text-paper" : "hover:bg-haze"}`}
                >
                  <span className="font-display text-[26px] font-medium tracking-tight">
                    {l.upper}
                    <span className={on ? "opacity-60" : "text-muted"}>{l.lower}</span>
                  </span>
                  {l.special ? <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-2 text-[14px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Sounds unlike English. Tap a letter to hear an example.
          </p>
        </div>

        <aside className="self-start lg:sticky lg:top-12">
          <p key={letter.upper} className="display-xl origin-left animate-pop text-[120px] leading-[0.85] text-ink">
            {letter.upper}
            <span className="text-muted">{letter.lower}</span>
          </p>
          <p className="mt-6 text-[14px] text-muted">Called “{letter.name}”</p>
          <p className="mt-4 text-[21px] leading-snug">{letter.sound}</p>
          <div className="mt-6 flex items-center gap-3 border-y border-line py-4">
            <div className="min-w-0 flex-1">
              <p className="tr-word text-[26px] leading-tight" lang="tr">
                {letter.example}
              </p>
              <p className="text-[15px] text-ink-soft">{letter.exampleEn}</p>
            </div>
            <Speak text={letter.example} />
            <Speak text={letter.example} slow />
          </div>
          {letter.tip ? <p className="mt-4 text-[15px] text-ink-soft">{letter.tip}</p> : null}
        </aside>
      </section>

      <section>
        <h2 className="font-display text-[26px] font-semibold">Vowel harmony</h2>
        <p className="mt-2 max-w-[60ch] text-[17px] text-ink-soft">
          Turkish endings copy the last vowel of the word. These two groupings decide the shape of every suffix you will learn.
        </p>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="font-medium">Two-way: the ending takes a or e</h3>
            <table className="mt-3 w-full text-left">
              <tbody>
                {[
                  { v: "a  ı  o  u", out: "a", ex: ["okul", "da"] },
                  { v: "e  i  ö  ü", out: "e", ex: ["ev", "de"] },
                ].map((r) => (
                  <tr key={r.out} className="border-b border-line">
                    <td className="font-display py-3 text-[24px] tracking-wide whitespace-pre">{r.v}</td>
                    <td className="font-display px-4 text-[24px] text-accent-text">-{r.out}</td>
                    <td className="tr-word text-right text-[21px]" lang="tr">
                      {r.ex[0]}
                      <span className="text-brand-text">{r.ex[1]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-medium">Four-way: the ending takes ı, i, u or ü</h3>
            <table className="mt-3 w-full text-left">
              <tbody>
                {[
                  { v: "a  ı", out: "ı", ex: ["kız", "ı"] },
                  { v: "e  i", out: "i", ex: ["ev", "i"] },
                  { v: "o  u", out: "u", ex: ["okul", "u"] },
                  { v: "ö  ü", out: "ü", ex: ["göz", "ü"] },
                ].map((r) => (
                  <tr key={r.out} className="border-b border-line">
                    <td className="font-display py-2 text-[21px] whitespace-pre">{r.v}</td>
                    <td className="font-display px-4 text-[21px] text-accent-text">-{r.out}</td>
                    <td className="tr-word text-right text-[19px]" lang="tr">
                      {r.ex[0]}
                      <span className="text-brand-text">{r.ex[1]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-6 max-w-[62ch] text-[15px] text-ink-soft">
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] font-semibold">Listen and spell</h2>
          <p className="text-ink-soft tabular">
            {score.n ? `${score.c} of ${score.n} right so far` : "Hear a word, then type it with the right letters."}
          </p>
        </div>
        {available ? (
          <div className="flex rounded-lg border border-line p-0.5" role="tablist" aria-label="Mode">
            {(["listen", "read"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={m === k}
                onClick={() => setMode(k)}
                className={`rounded-md px-3 py-1.5 text-[14px] ${m === k ? "bg-ink text-paper" : "text-ink-soft"}`}
              >
                {k === "listen" ? "Listen" : "Sound it out"}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="rounded-[14px] border border-line p-5 sm:p-7">
        <div className="mb-8">
          {m === "listen" ? (
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={() => speak(w.tr, 0.8)}>
                Play the word
              </button>
              <button className="btn-quiet" onClick={() => speak(w.tr, 0.55)}>
                Slower
              </button>
              <span className="text-[15px] text-muted">It means “{w.en}”.</span>
            </div>
          ) : (
            <>
              <p className="text-[15px] text-muted">It sounds roughly like</p>
              <p className="font-display mt-1 text-[33px] leading-tight font-medium">“{w.say}”</p>
              <p className="mt-1 text-[15px] text-muted">and means “{w.en}”.</p>
            </>
          )}
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
            className={`${ans ? RESULT_COPY[ans.result].btn : "btn-primary"} sm:w-40`}
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
      {!available ? <p className="mt-3 text-[14px] text-muted">No Turkish voice is installed on this device, so audio is hidden. Settings explains how to add one.</p> : null}
    </section>
  );
}
