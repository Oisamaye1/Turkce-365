"use client";

import Link from "next/link";
import { useState } from "react";
import { addLessonPhrasesAction, completeLessonAction, recordReviewAction, saveLessonProgressAction } from "@/app/actions";
import type { Card } from "@/lib/db/cards";
import type { LessonProgress } from "@/lib/db/lessons";
import type { Drill } from "@/lib/grammar/drills";
import type { WordAnalysis } from "@/lib/lesson/analyze";
import type { DailyLesson } from "@/lib/lesson/schema";
import { suggestGrade } from "@/lib/srs/sm2";
import { DrillSet } from "../drill-runner";
import { FocusShell, FooterBar } from "../focus";
import { Simit } from "../simit";
import { Speak, useSpeech } from "../speech";
import { TypeAnswer, type AnswerResult } from "../type-answer";
import { SpeechBubble } from "../ui";
import { WritingBox } from "../writing-box";

const SECTIONS = [
  { en: "Warm-up", tr: "Isınma" },
  { en: "Dialogue", tr: "Diyalog" },
  { en: "New phrases", tr: "Yeni ifadeler" },
  { en: "Grammar", tr: "Dilbilgisi" },
  { en: "Writing", tr: "Yazma" },
];

export function LessonPlayer({
  lesson,
  progress,
  completed,
  warmupCards,
  drills,
  analysis,
  initialSection,
}: {
  lesson: DailyLesson;
  progress: LessonProgress;
  completed: boolean;
  warmupCards: Card[];
  drills: Drill[];
  analysis: Record<string, WordAnalysis>;
  initialSection?: number;
}) {
  const [section, setSection] = useState(Math.min(initialSection ?? progress.section ?? 0, SECTIONS.length));
  const [prog, setProg] = useState<LessonProgress>(progress);
  const [sub, setSub] = useState(0); // fine-grained progress inside a section (0–1)

  const go = (n: number, patch: Partial<LessonProgress> = {}) => {
    const next = { ...prog, ...patch, section: Math.max(n, prog.section ?? 0) };
    setProg(next);
    setSection(n);
    setSub(0);
    saveLessonProgressAction(lesson.date, next);
    if (n >= SECTIONS.length) completeLessonAction(lesson.date);
    window.scrollTo({ top: 0 });
  };

  const label =
    section < SECTIONS.length ? (
      <span className="font-display hidden text-[15px] font-bold text-muted sm:inline">
        {section + 1} of {SECTIONS.length}
      </span>
    ) : null;

  return (
    <FocusShell progress={Math.min(section + sub, SECTIONS.length)} max={SECTIONS.length} right={label}>
      {section < SECTIONS.length ? (
        <div className="mb-5">
          <p className="font-display font-bold text-kobalt">{SECTIONS[section].en}</p>
          <p className="text-sm text-muted" lang="tr">
            {SECTIONS[section].tr}
          </p>
        </div>
      ) : null}

      {section === 0 ? <Warmup cards={warmupCards} lesson={lesson} onStep={setSub} onDone={(w) => go(1, { warmup: w })} /> : null}
      {section === 1 ? <DialogueSection lesson={lesson} analysis={analysis} onDone={() => go(2)} /> : null}
      {section === 2 ? <PhrasesSection lesson={lesson} added={!!prog.phrasesAdded} onDone={() => go(3, { phrasesAdded: true })} /> : null}
      {section === 3 ? <GrammarSection lesson={lesson} drills={drills} onStep={setSub} onDone={(d) => go(4, { drills: d })} /> : null}
      {section === 4 ? (
        <>
          <h1 className="font-display mb-4 text-2xl font-extrabold">Write a few sentences</h1>
          <WritingBox prompt={lesson.writing.prompt} promptTr={lesson.writing.promptTr} hints={lesson.writing.hints} lessonDate={lesson.date} />
          <FooterBar note="Your writing is saved and corrected even if you finish now.">
            <button className="btn-primary sm:w-48" onClick={() => go(5)}>
              Finish lesson
            </button>
          </FooterBar>
        </>
      ) : null}
      {section >= SECTIONS.length ? (
        <div className="flex flex-col items-center pt-6 text-center">
          <Simit size={160} mood="proud" />
          <h1 className="font-display mt-4 text-4xl font-extrabold text-cay-depth">Ders bitti!</h1>
          <p className="mt-1 max-w-sm text-ink-soft">
            Lesson complete{completed ? " (again)" : ""}. Your five new phrases are in the deck, and any writing corrections land in today&apos;s reviews.
          </p>
          <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-cay p-3">
              <div className="font-display text-3xl font-extrabold text-cay-depth">
                {prog.warmup ? `${prog.warmup.correct}/${prog.warmup.total}` : "—"}
              </div>
              <div className="text-sm text-ink-soft">Warm-up</div>
            </div>
            <div className="rounded-2xl border-2 border-zeytin p-3">
              <div className="font-display text-3xl font-extrabold text-zeytin-depth">{prog.drills ? `${prog.drills.correct}/${prog.drills.total}` : "—"}</div>
              <div className="text-sm text-ink-soft">Suffix drills</div>
            </div>
          </div>
          <FooterBar>
            <Link href="/review" className="btn-ghost">
              Reviews
            </Link>
            <Link href="/" className="btn-primary">
              Back to the path
            </Link>
          </FooterBar>
        </div>
      ) : null}
    </FocusShell>
  );
}

// ---------------------------------------------------------------- 1. warm-up

function Warmup({
  cards,
  lesson,
  onStep,
  onDone,
}: {
  cards: Card[];
  lesson: DailyLesson;
  onStep: (x: number) => void;
  onDone: (w: { correct: number; total: number }) => void;
}) {
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<AnswerResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const card = cards[i];
  const finished = i >= cards.length;

  const checked = (r: AnswerResult) => {
    setAns(r);
    if (r.result === "correct") setCorrect((c) => c + 1);
    recordReviewAction({
      cardId: card.id,
      direction: "en-tr",
      answer: r.given,
      result: r.result,
      msTaken: r.ms,
      grade: suggestGrade(r.result, r.ms, card.tr.length),
      context: "warmup",
    });
  };

  if (!finished) {
    return (
      <>
        <h1 className="font-display text-2xl font-extrabold">Recycle a recent mistake</h1>
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
          onChecked={checked}
          sheet="fixed"
          details={card.exTr ? <span className="text-sm" lang="tr">{card.exTr}</span> : null}
        >
          <button
            className={ans?.result === "correct" ? "btn-success sm:w-44" : ans?.result === "almost" ? "btn-cay sm:w-44" : "btn-danger sm:w-44"}
            autoFocus
            onClick={() => {
              setAns(null);
              setI(i + 1);
              onStep((i + 1) / Math.max(1, cards.length));
            }}
          >
            Continue
          </button>
        </TypeAnswer>
      </>
    );
  }

  return (
    <>
      {cards.length === 0 ? (
        <div className="flex items-center gap-3">
          <Simit size={96} mood="happy" className="shrink-0" />
          <SpeechBubble>No recent mistakes to recycle — great start. Straight on to the dialogue.</SpeechBubble>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Simit size={96} mood="happy" className="shrink-0" />
          <SpeechBubble>
            Warm-up done: <b>{correct}</b> of {cards.length} right.
          </SpeechBubble>
        </div>
      )}

      {lesson.leeches.length ? (
        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-extrabold">Words that keep slipping away</h2>
          {lesson.leeches.map((l) => (
            <div key={l.tr} className="rounded-3xl border-2 border-cay bg-cay-tint/40 p-4">
              <div className="flex items-center gap-3">
                <Speak text={l.tr} />
                <span className="tr-word text-3xl" lang="tr">
                  {l.tr}
                </span>
                <span className="text-ink-soft">{l.en}</span>
              </div>
              <p className="mt-3">{l.mnemonic}</p>
              <ul className="mt-3 space-y-2">
                {l.examples.map((e) => (
                  <li key={e.tr} className="flex items-start gap-2">
                    <Speak text={e.tr} size="sm" />
                    <span>
                      <span lang="tr" className="font-medium">
                        {e.tr}
                      </span>
                      <span className="block text-sm text-ink-soft">{e.en}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <FooterBar>
        <button className="btn-primary sm:w-44" autoFocus onClick={() => onDone({ correct, total: cards.length })}>
          Continue
        </button>
      </FooterBar>
    </>
  );
}

// ---------------------------------------------------------------- 2. dialogue

const AVATAR_TONES = ["bg-cay text-[#4a2c00]", "bg-turkuaz text-white", "bg-nar text-white"];

function DialogueSection({ lesson, analysis, onDone }: { lesson: DailyLesson; analysis: Record<string, WordAnalysis>; onDone: () => void }) {
  const { speak, available } = useSpeech();
  const [showEn, setShowEn] = useState(false);
  const [selected, setSelected] = useState<{ line: number; key: string } | null>(null);
  const others = [...new Set(lesson.dialogue.lines.map((l) => l.speaker))].filter((s) => s.toLocaleLowerCase("tr-TR") !== "sen");

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold">{lesson.title}</h1>
      <p className="mt-1 text-ink-soft">{lesson.dialogue.setting}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {available ? (
          <button className="btn-ghost !min-h-10 !px-4 !text-[15px]" onClick={() => speak(lesson.dialogue.lines.map((l) => l.tr).join(" … "), 0.85)}>
            Play the whole dialogue
          </button>
        ) : null}
        <button className="btn-quiet" onClick={() => setShowEn((v) => !v)} aria-pressed={showEn}>
          {showEn ? "Hide translations" : "Show translations"}
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">Tap any word to see what it means and how it&apos;s built.</p>

      <ol className="mt-6 space-y-4">
        {lesson.dialogue.lines.map((l, i) => {
          const isMe = l.speaker.toLocaleLowerCase("tr-TR") === "sen";
          const tone = AVATAR_TONES[Math.max(0, others.indexOf(l.speaker)) % AVATAR_TONES.length];
          return (
            <li key={i} className={`flex items-end gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
              <span
                className={`font-display grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-extrabold ${isMe ? "bg-kobalt text-white" : tone}`}
                aria-hidden="true"
              >
                {isMe ? "S" : l.speaker[0]}
              </span>
              <div
                className={`max-w-[85%] rounded-3xl border-2 px-4 py-3 ${
                  isMe ? "rounded-br-md border-kobalt/30 bg-kobalt-tint" : "rounded-bl-md border-line bg-paper"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted">{isMe ? "You (Sen)" : l.speaker}</span>
                  <Speak text={l.tr} size="sm" />
                </div>
                <p className="text-lg leading-relaxed" lang="tr">
                  <Tokens text={l.tr} line={i} analysis={analysis} selected={selected} onSelect={setSelected} />
                </p>
                {showEn ? <p className="mt-1 text-sm text-ink-soft">{l.en}</p> : null}
                {selected?.line === i ? <WordInfo a={analysis[selected.key]} /> : null}
              </div>
            </li>
          );
        })}
      </ol>

      <FooterBar>
        <button className="btn-primary sm:w-44" onClick={onDone}>
          Continue
        </button>
      </FooterBar>
    </>
  );
}

function Tokens({
  text,
  line,
  analysis,
  selected,
  onSelect,
}: {
  text: string;
  line: number;
  analysis: Record<string, WordAnalysis>;
  selected: { line: number; key: string } | null;
  onSelect: (s: { line: number; key: string } | null) => void;
}) {
  const parts = text.split(/([A-Za-zÇĞİÖŞÜçğıöşüâîû]+(?:'[A-Za-zçğıöşüâîû]+)?)/);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <span key={i}>{p}</span>;
        const key = p.toLocaleLowerCase("tr-TR");
        const known = !!analysis[key];
        const isSel = selected?.line === line && selected.key === key;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(isSel ? null : { line, key })}
            className={`rounded-md ${
              isSel ? "bg-kobalt text-white" : known ? "underline decoration-kobalt/40 decoration-dashed decoration-2 underline-offset-[5px] hover:bg-kobalt-tint" : "hover:bg-wash"
            }`}
          >
            {p}
          </button>
        );
      })}
    </>
  );
}

function WordInfo({ a }: { a?: WordAnalysis }) {
  if (!a) return <p className="mt-2 rounded-2xl bg-wash p-2.5 text-sm text-ink-soft">No breakdown for this word — see the translation.</p>;
  return (
    <div className="mt-2 rounded-2xl bg-paper p-3 text-sm" style={{ animation: "pop 160ms ease-out" }}>
      <p>
        <b className="font-display text-base" lang="tr">
          {a.word}
        </b>{" "}
        means <b>{a.meaning}</b>
        {a.description ? <span className="text-ink-soft"> ({a.description})</span> : null}
      </p>
      {a.parts.length > 1 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {a.parts.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 ? <span className="text-muted">+</span> : null}
              <span className={`font-display rounded-lg px-2 py-0.5 font-bold ${i === 0 ? "bg-wash text-ink" : "bg-turkuaz-tint text-turkuaz-depth"}`}>{p}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- 3. phrases

function PhrasesSection({ lesson, added, onDone }: { lesson: DailyLesson; added: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold">Five phrases from the dialogue</h1>
      <p className="mt-1 text-ink-soft">They go into your review deck, so you&apos;ll see them again tomorrow.</p>
      <ul className="mt-6 space-y-3">
        {lesson.newPhrases.map((p) => (
          <li key={p.tr} className="flex items-start gap-3 rounded-3xl border-2 border-line p-4">
            <Speak text={p.tr} />
            <div className="min-w-0">
              <p className="tr-word text-2xl leading-tight" lang="tr">
                {p.tr}
              </p>
              <p className="text-ink-soft">{p.en}</p>
              {p.exTr ? (
                <p className="mt-2 text-sm">
                  <span lang="tr">{p.exTr}</span> <span className="text-muted">{p.exEn}</span>
                </p>
              ) : null}
              {p.note ? <p className="mt-1 text-sm text-muted">{p.note}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      <FooterBar>
        <button
          className="btn-primary sm:w-56"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            if (!added) await addLessonPhrasesAction(lesson.date);
            onDone();
          }}
        >
          {added ? "Continue" : "Add to my deck"}
        </button>
      </FooterBar>
    </>
  );
}

// ---------------------------------------------------------------- 4. grammar

function GrammarSection({
  lesson,
  drills,
  onStep,
  onDone,
}: {
  lesson: DailyLesson;
  drills: Drill[];
  onStep: (x: number) => void;
  onDone: (d: { correct: number; total: number }) => void;
}) {
  const [practice, setPractice] = useState(false);
  if (practice) {
    return (
      <DrillSet
        drills={drills}
        context="lesson"
        onProgress={(i) => onStep(i / Math.max(1, drills.length))}
        onFinish={(o) => onDone({ correct: o.filter((x) => x.result === "correct").length, total: o.length })}
      />
    );
  }
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold">{lesson.grammar.title}</h1>
      <p className="mt-3 max-w-[65ch] text-lg leading-relaxed">{lesson.grammar.explanation}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {lesson.grammar.examples.map((e) => (
          <div key={e.tr} className="flex items-start gap-3 rounded-3xl border-2 border-line p-4">
            <Speak text={e.tr} size="sm" />
            <div>
              <p className="tr-word text-xl leading-tight" lang="tr">
                {e.tr}
              </p>
              <p className="text-sm text-ink-soft">{e.en}</p>
              {e.breakdown ? <p className="font-display mt-1 text-sm font-bold text-turkuaz-depth">{e.breakdown}</p> : null}
            </div>
          </div>
        ))}
      </div>
      <FooterBar note={`${drills.length} suffix drills come next.`}>
        <button className="btn-primary sm:w-44" onClick={() => setPractice(true)}>
          Practise
        </button>
      </FooterBar>
    </>
  );
}
