"use client";

import { useState, useTransition } from "react";
import { learnWordNowAction, markReadAction } from "@/app/actions";
import type { WordAnalysis } from "@/lib/lesson/analyze";
import { trLower } from "@/lib/turkish/text";
import { WordAnatomy } from "../anatomy";
import { IconCheck, IconX } from "../icons";
import { Choices } from "../practice/shared";
import { Speak, useSpeech } from "../speech";

export interface ReaderLine {
  speaker?: string;
  tr: string;
  en: string;
}

const TOKEN = /([A-Za-zÇĞİÖŞÜçğıöşüâîû]+(?:'[A-Za-zçğıöşüâîû]+)?)/;

export function Reader({
  id,
  lines,
  analysis,
  dictionary,
  questions = [],
  alreadyRead,
}: {
  id: string;
  lines: ReaderLine[];
  analysis: Record<string, WordAnalysis>;
  /** Dictionary entries by Turkish root: card id and whether it's started. */
  dictionary: Record<string, { id: number; started: boolean }>;
  questions?: { q: string; options: string[]; answer: number }[];
  alreadyRead: boolean;
}) {
  const { voice, available } = useSpeech();
  const [showAll, setShowAll] = useState(false);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [word, setWord] = useState<{ text: string; a?: WordAnalysis } | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(alreadyRead && !questions.length);
  const [playing, setPlaying] = useState<number | null>(null);

  const playAll = () => {
    if (!available || !voice) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    lines.forEach((l, i) => {
      const u = new SpeechSynthesisUtterance(l.tr);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.85;
      u.onstart = () => setPlaying(i);
      u.onend = () => setPlaying((p) => (p === i ? (i + 1 < lines.length ? p : null) : p));
      synth.speak(u);
    });
  };

  const entry = word?.a ? dictionary[trLower(word.a.root)] : undefined;
  const finishReading = () => {
    setFinished(true);
    markReadAction(id);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button className={showAll ? "btn-secondary" : "btn-quiet h-11"} onClick={() => setShowAll((v) => !v)} aria-pressed={showAll}>
            {showAll ? "Hide translations" : "Show all translations"}
          </button>
          {available ? (
            <button className="btn-quiet h-11" onClick={playAll}>
              Listen to it all
            </button>
          ) : null}
          <span className="text-[14px] text-muted">Tap any word to see what it's made of.</span>
        </div>

        <ol className="stagger space-y-5">
          {lines.map((l, i) => {
            const open = showAll || shown.has(i);
            return (
              <li key={i} style={{ "--i": i } as React.CSSProperties} className={`rounded-[12px] transition-colors ${playing === i ? "bg-accent-tint/50" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {l.speaker ? <p className={`text-[13px] ${l.speaker === "Sen" ? "text-accent-text" : "text-muted"}`}>{l.speaker === "Sen" ? "You" : l.speaker}</p> : null}
                    <p className="tr-word text-[22px] leading-relaxed" lang="tr">
                      {l.tr.split(TOKEN).map((t, k) =>
                        TOKEN.test(t) ? (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setWord({ text: t, a: analysis[trLower(t)] })}
                            className={`rounded-[4px] decoration-dotted decoration-line-strong underline-offset-[6px] transition-colors hover:bg-brand-tint hover:underline ${
                              word?.text === t ? "bg-brand-tint text-brand-text" : ""
                            }`}
                          >
                            {t}
                          </button>
                        ) : (
                          <span key={k}>{t}</span>
                        ),
                      )}
                    </p>
                    {open ? (
                      <p className="mt-0.5 animate-fade text-[15px] text-ink-soft">{l.en}</p>
                    ) : (
                      <button className="mt-0.5 text-[14px] text-muted hover:text-ink" onClick={() => setShown((s) => new Set(s).add(i))}>
                        Show translation
                      </button>
                    )}
                  </div>
                  <Speak text={l.tr} size="sm" />
                </div>
              </li>
            );
          })}
        </ol>

        {questions.length ? (
          <section className="mt-14 border-t border-line pt-8" aria-labelledby="q-h">
            <h2 id="q-h" className="font-display mb-4 text-[24px] font-semibold">
              Did you get it?
            </h2>
            {finished ? (
              <p className="flex animate-rise items-center gap-2 rounded-[12px] bg-ok-tint p-4 text-ok-text">
                <IconCheck size={18} /> {alreadyRead && qi === 0 ? "You've read this one." : `${right} of ${questions.length} right. Marked as read.`}
              </p>
            ) : (
              <>
                <p className="mb-3 text-[14px] text-muted tabular">
                  {qi + 1} of {questions.length}
                </p>
                <p key={qi} className="font-display mb-4 animate-slide-in text-[19px] font-semibold">
                  {questions[qi].q}
                </p>
                <Choices
                  options={questions[qi].options}
                  answer={questions[qi].options[questions[qi].answer]}
                  picked={picked}
                  lang="en"
                  cols={1}
                  onPick={(o) => {
                    setPicked(o);
                    if (o === questions[qi].options[questions[qi].answer]) setRight((r) => r + 1);
                  }}
                />
                {picked !== null ? (
                  <button
                    className="btn-primary mt-4"
                    autoFocus
                    onClick={() => {
                      if (qi + 1 >= questions.length) finishReading();
                      else {
                        setQi(qi + 1);
                        setPicked(null);
                      }
                    }}
                  >
                    {qi + 1 >= questions.length ? "Finish" : "Next question"}
                  </button>
                ) : null}
              </>
            )}
          </section>
        ) : !finished ? (
          <button className="btn-primary mt-10" onClick={finishReading}>
            Mark as read
          </button>
        ) : (
          <p className="mt-10 flex items-center gap-2 text-ok-text">
            <IconCheck size={18} /> Read
          </p>
        )}
      </div>

      {/* Word panel: a sheet on phones, a side column on wide screens */}
      <aside
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 lg:static lg:z-auto lg:translate-y-0 lg:self-start lg:rounded-[14px] lg:border lg:p-5 lg:shadow-none ${
          word ? "translate-y-0" : "translate-y-full lg:block"
        } lg:sticky lg:top-12`}
        aria-live="polite"
      >
        {word ? (
          <div key={word.text} className="animate-fade">
            <div className="flex items-start justify-between gap-3">
              <p className="tr-word text-[28px] leading-tight" lang="tr">
                {word.text}
              </p>
              <div className="flex items-center gap-1">
                <Speak text={word.text} size="sm" />
                <button className="rounded-lg p-1.5 text-muted hover:bg-haze lg:hidden" onClick={() => setWord(null)} aria-label="Close">
                  <IconX size={18} />
                </button>
              </div>
            </div>
            {word.a ? (
              <>
                {word.a.parts.length > 1 ? (
                  <div className="mt-3">
                    <WordAnatomy parts={word.a.parts} size="sm" />
                  </div>
                ) : null}
                <p className="mt-3 text-[17px]">{word.a.meaning}</p>
                {word.a.description && word.a.parts.length > 1 ? <p className="text-[14px] text-muted">{word.a.description}</p> : null}
                {word.a.root !== word.text.toLocaleLowerCase("tr") ? (
                  <p className="mt-1 text-[14px] text-muted">
                    from <span className="tr-word text-ink">{word.a.root}</span>
                  </p>
                ) : null}
                {entry && !entry.started && !added.has(entry.id) ? (
                  <button
                    className="btn-secondary mt-4 w-full"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await learnWordNowAction(entry.id);
                        if (r.ok) setAdded((s) => new Set(s).add(entry.id));
                      })
                    }
                  >
                    Add to my reviews
                  </button>
                ) : entry && added.has(entry.id) ? (
                  <p className="mt-4 text-[14px] text-ok-text">Added to your reviews.</p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-[15px] text-ink-soft">This word isn&apos;t in the app&apos;s dictionary yet. The line&apos;s translation shows its meaning.</p>
            )}
          </div>
        ) : (
          <p className="hidden text-[15px] text-muted lg:block">Tap a word to see its meaning and the pieces it&apos;s built from.</p>
        )}
      </aside>
    </div>
  );
}
