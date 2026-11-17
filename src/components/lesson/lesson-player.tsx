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
import { WordAnatomy, parseBreakdown } from "../anatomy";
import { DrillSet } from "../drill-runner";
import { FocusShell, FooterBar } from "../focus";
import { Speak, useSpeech } from "../speech";
import { TypeAnswer, type AnswerResult } from "../type-answer";
import { CardExercise } from "../card-exercise";
import { exerciseFor } from "@/lib/srs/ladder";
import type { PoolWord } from "@/lib/srs/stage";
import { Prompt, RESULT_COPY } from "../ui";
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
  stage,
  pool,
}: {
  lesson: DailyLesson;
  progress: LessonProgress;
  completed: boolean;
  warmupCards: Card[];
  drills: Drill[];
  analysis: Record<string, WordAnalysis>;
  initialSection?: number;
  stage: number;
  pool: PoolWord[];
}) {
  const [section, setSection] = useState(Math.min(initialSection ?? progress.section ?? 0, SECTIONS.length));
  const [prog, setProg] = useState<LessonProgress>(progress);
  const [sub, setSub] = useState(0);

  const go = (n: number, patch: Partial<LessonProgress> = {}) => {
    const next = { ...prog, ...patch, section: Math.max(n, prog.section ?? 0) };
    setProg(next);
    setSection(n);
    setSub(0);
    saveLessonProgressAction(lesson.date, next);
    if (n >= SECTIONS.length) completeLessonAction(lesson.date);
    window.scrollTo({ top: 0 });
  };

  return (
    <FocusShell
      progress={Math.min(section + sub, SECTIONS.length)}
      max={SECTIONS.length}
      right={section < SECTIONS.length ? `${section + 1} of ${SECTIONS.length}` : null}
    >
      {section < SECTIONS.length ? (
        <p className="mb-6 text-[15px] text-muted">
          <span className="font-medium text-accent-text">{SECTIONS[section].en}</span>
          <span className="ml-2" lang="tr">
            {SECTIONS[section].tr}
          </span>
        </p>
      ) : null}

      {section === 0 ? <Warmup cards={warmupCards} lesson={lesson} stage={stage} pool={pool} onStep={setSub} onDone={(w) => go(1, { warmup: w })} /> : null}
      {section === 1 ? <DialogueSection lesson={lesson} analysis={analysis} onDone={() => go(2)} /> : null}
      {section === 2 ? <PhrasesSection lesson={lesson} added={!!prog.phrasesAdded} onDone={() => go(3, { phrasesAdded: true })} /> : null}
      {section === 3 ? <GrammarSection lesson={lesson} drills={drills} onStep={setSub} onDone={(d) => go(4, { drills: d })} /> : null}
      {section === 4 ? (
        <>
          <WritingBox prompt={lesson.writing.prompt} promptTr={lesson.writing.promptTr} hints={lesson.writing.hints} lessonDate={lesson.date} />
          <FooterBar note="Your writing is kept and corrected even if you finish now.">
            <button className="btn-primary sm:w-44" onClick={() => go(5)}>
              Finish lesson
            </button>
          </FooterBar>
        </>
      ) : null}
      {section >= SECTIONS.length ? (
        <div className="pt-6">
          <h1 className="display-xl text-[56px] sm:text-[80px]" lang="tr">
            Ders bitti.
          </h1>
          <p className="mt-4 max-w-[52ch] text-[17px] text-ink-soft">
            Lesson complete{completed ? " (again)" : ""}. The five new phrases are in your deck, and any writing corrections land in today&apos;s reviews.
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-2 gap-6 border-t border-line pt-6 tabular">
            <div>
              <dd className="font-display text-[42px] leading-none font-semibold">{prog.warmup ? `${prog.warmup.correct}/${prog.warmup.total}` : "–"}</dd>
              <dt className="mt-2 text-[14px] text-muted">warm-up</dt>
            </div>
            <div>
              <dd className="font-display text-[42px] leading-none font-semibold">{prog.drills ? `${prog.drills.correct}/${prog.drills.total}` : "–"}</dd>
              <dt className="mt-2 text-[14px] text-muted">suffix drills</dt>
            </div>
          </dl>
          <FooterBar>
            <Link href="/review" className="btn-secondary">
              Reviews
            </Link>
            <Link href="/" className="btn-primary">
              Back to today
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
  stage,
  pool,
  onStep,
  onDone,
}: {
  cards: Card[];
  lesson: DailyLesson;
  stage: number;
  pool: PoolWord[];
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
        <CardExercise
          key={card.id}
          // Mistakes come back as recall, paced by stage: pick → build/hint → type.
          exercise={exerciseFor({ direction: "en-tr", repetitions: Math.min(stage, 3), stage, tr: card.tr, pos: card.pos })}
          card={card}
          direction="en-tr"
          pool={pool}
          label={`A recent mistake, ${i + 1} of ${cards.length}`}
          onChecked={checked}
          result={ans}
          showLadder={false}
          details={card.exTr ? <span className="text-[15px]" lang="tr">{card.exTr}</span> : null}
        >
          <button
            className={`${ans ? RESULT_COPY[ans.result].btn : "btn-primary"} sm:w-40`}
            autoFocus
            onClick={() => {
              setAns(null);
              setI(i + 1);
              onStep((i + 1) / Math.max(1, cards.length));
            }}
          >
            Continue
          </button>
        </CardExercise>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-[33px] leading-tight font-semibold">
        {cards.length === 0 ? "Nothing to recycle yet" : `Warm-up done: ${correct} of ${cards.length}`}
      </h1>
      <p className="mt-2 text-[17px] text-ink-soft">
        {cards.length === 0 ? "No recent mistakes — straight on to the dialogue." : "Mistakes you fix here come back less often."}
      </p>

      {lesson.leeches.length ? (
        <section className="mt-10">
          <h2 className="font-display text-[21px] font-semibold">Words that keep slipping away</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {lesson.leeches.map((l) => (
              <div key={l.tr} className="py-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="tr-word text-[33px]" lang="tr">
                    {l.tr}
                  </span>
                  <span className="text-ink-soft">{l.en}</span>
                  <Speak text={l.tr} size="sm" className="self-center" />
                </div>
                <p className="mt-2 max-w-[60ch]">{l.mnemonic}</p>
                <ul className="mt-3 space-y-1.5 text-[15px]">
                  {l.examples.map((e) => (
                    <li key={e.tr}>
                      <span lang="tr" className="font-medium">
                        {e.tr}
                      </span>{" "}
                      <span className="text-ink-soft">{e.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <FooterBar>
        <button className="btn-primary sm:w-40" autoFocus onClick={() => onDone({ correct, total: cards.length })}>
          Continue
        </button>
      </FooterBar>
    </>
  );
}

// ---------------------------------------------------------------- 2. dialogue

function DialogueSection({ lesson, analysis, onDone }: { lesson: DailyLesson; analysis: Record<string, WordAnalysis>; onDone: () => void }) {
  const { speak, available } = useSpeech();
  const [showEn, setShowEn] = useState(false);
  const [selected, setSelected] = useState<{ line: number; key: string } | null>(null);

  return (
    <>
      <h1 className="font-display text-[33px] leading-tight font-semibold sm:text-[42px]">{lesson.title}</h1>
      <p className="mt-2 max-w-[60ch] text-[17px] text-ink-soft">{lesson.dialogue.setting}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {available ? (
          <button className="btn-secondary !h-9 !text-[14px]" onClick={() => speak(lesson.dialogue.lines.map((l) => l.tr).join(" … "), 0.85)}>
            Play the dialogue
          </button>
        ) : null}
        <button className="btn-quiet" onClick={() => setShowEn((v) => !v)} aria-pressed={showEn}>
          {showEn ? "Hide translations" : "Show translations"}
        </button>
        <span className="text-[14px] text-muted">Tap a word to take it apart.</span>
      </div>

      <ol className="mt-8 border-t border-line">
        {lesson.dialogue.lines.map((l, i) => {
          const isMe = l.speaker.toLocaleLowerCase("tr-TR") === "sen";
          return (
            <li key={i} className="grid grid-cols-[72px_minmax(0,1fr)_auto] gap-x-4 border-b border-line py-4 sm:grid-cols-[110px_minmax(0,1fr)_auto]">
              <span className={`pt-1 text-[14px] ${isMe ? "font-medium text-accent-text" : "text-muted"}`}>{isMe ? "You" : l.speaker}</span>
              <div className="min-w-0">
                <p className="tr-word text-[21px] leading-snug font-medium sm:text-[24px]" lang="tr">
                  <Tokens text={l.tr} line={i} analysis={analysis} selected={selected} onSelect={setSelected} />
                </p>
                {showEn ? <p className="mt-1 text-[15px] text-ink-soft">{l.en}</p> : null}
                {selected?.line === i ? <WordInfo a={analysis[selected.key]} /> : null}
              </div>
              <Speak text={l.tr} size="sm" />
            </li>
          );
        })}
      </ol>

      <FooterBar>
        <button className="btn-primary sm:w-40" onClick={onDone}>
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
            className={`rounded-sm transition-colors ${
              isSel ? "bg-accent-tint text-accent-text" : known ? "underline decoration-line-strong decoration-1 underline-offset-[6px] hover:decoration-accent" : "hover:bg-haze"
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
  if (!a) return <p className="mt-3 text-[14px] text-muted">No breakdown for this word — see the translation.</p>;
  return (
    <div className="mt-4 rounded-[12px] bg-haze p-4" style={{ animation: "reveal 160ms ease-out" }}>
      {a.parts.length > 1 ? <WordAnatomy parts={a.parts} size="md" /> : <span className="tr-word text-[21px]">{a.word}</span>}
      <p className="mt-3 text-[15px]">
        <b className="font-medium">{a.meaning}</b>
        {a.description ? <span className="text-ink-soft">: {a.description}</span> : null}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- 3. phrases

function PhrasesSection({ lesson, added, onDone }: { lesson: DailyLesson; added: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h1 className="font-display text-[33px] leading-tight font-semibold">Five phrases from the dialogue</h1>
      <p className="mt-2 text-[17px] text-ink-soft">They go into your review deck, so you&apos;ll see them again tomorrow.</p>
      <ol className="mt-8 border-t border-line">
        {lesson.newPhrases.map((p, i) => (
          <li key={p.tr} className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-x-3 border-b border-line py-5">
            <span className="pt-2 text-[14px] text-muted tabular">{i + 1}</span>
            <div className="min-w-0">
              <p className="tr-word text-[26px] leading-tight" lang="tr">
                {p.tr}
              </p>
              <p className="mt-0.5 text-ink-soft">{p.en}</p>
              {p.exTr ? (
                <p className="mt-2 text-[15px]">
                  <span lang="tr">{p.exTr}</span> <span className="text-muted">{p.exEn}</span>
                </p>
              ) : null}
              {p.note ? <p className="mt-1 text-[14px] text-muted">{p.note}</p> : null}
            </div>
            <Speak text={p.tr} size="sm" className="mt-1" />
          </li>
        ))}
      </ol>
      <FooterBar>
        <button
          className="btn-primary sm:w-48"
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
      <h1 className="font-display text-[33px] leading-tight font-semibold sm:text-[42px]">{lesson.grammar.title}</h1>
      <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed">{lesson.grammar.explanation}</p>
      <ul className="mt-8 border-t border-line">
        {lesson.grammar.examples.map((e) => (
          <li key={e.tr} className="flex items-start justify-between gap-4 border-b border-line py-5">
            <div className="min-w-0">
              {e.breakdown ? <WordAnatomy parts={parseBreakdown(e.breakdown)} size="md" /> : <span className="tr-word text-[24px]">{e.tr}</span>}
              <p className="mt-2 text-[15px] text-ink-soft">
                <span lang="tr" className="font-medium text-ink">
                  {e.tr}
                </span>{" "}
                {e.en}
              </p>
            </div>
            <Speak text={e.tr} size="sm" />
          </li>
        ))}
      </ul>
      <FooterBar note={`${drills.length} suffix drills next.`}>
        <button className="btn-primary sm:w-40" onClick={() => setPractice(true)}>
          Practise
        </button>
      </FooterBar>
    </>
  );
}
