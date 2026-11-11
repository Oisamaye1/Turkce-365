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
import { Speak, useSpeech } from "../speech";
import { TypeAnswer, type AnswerResult } from "../type-answer";
import { Badge, ProgressBar } from "../ui";
import { WritingBox } from "../writing-box";

const SECTIONS = [
  { en: "Warm-up", tr: "Isınma", min: 3 },
  { en: "Dialogue", tr: "Diyalog", min: 5 },
  { en: "New phrases", tr: "Yeni ifadeler", min: 3 },
  { en: "Grammar", tr: "Dilbilgisi", min: 4 },
  { en: "Writing", tr: "Yazma", min: 5 },
];

export function LessonPlayer({
  lesson,
  progress,
  completed,
  warmupCards,
  drills,
  analysis,
}: {
  lesson: DailyLesson;
  progress: LessonProgress;
  completed: boolean;
  warmupCards: Card[];
  drills: Drill[];
  analysis: Record<string, WordAnalysis>;
}) {
  const [section, setSection] = useState(Math.min(progress.section ?? 0, SECTIONS.length));
  const [prog, setProg] = useState<LessonProgress>(progress);

  const go = (n: number, patch: Partial<LessonProgress> = {}) => {
    const next = { ...prog, ...patch, section: n };
    setProg(next);
    setSection(n);
    saveLessonProgressAction(lesson.date, next);
    if (n >= SECTIONS.length) completeLessonAction(lesson.date);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs text-muted">{lesson.date}</div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <div className="text-muted">{lesson.titleTr}</div>
          </div>
          <div className="flex gap-1.5">
            {lesson.source === "claude" ? <Badge tone="sea">✨ Claude</Badge> : <Badge>📦 Offline</Badge>}
            {completed ? <Badge tone="good">Done ✓</Badge> : null}
          </div>
        </div>
        <ProgressBar value={section} max={SECTIONS.length} />
        <div className="flex gap-1 overflow-x-auto text-xs [scrollbar-width:none]">
          {SECTIONS.map((s, i) => (
            <button
              key={s.en}
              onClick={() => go(i)}
              className={`shrink-0 rounded-full px-2.5 py-1 ${i === section ? "bg-fg text-bg" : i < section ? "bg-good-soft text-good" : "bg-card-2 text-muted"}`}
            >
              {i + 1}. {s.en} · {s.tr}
            </button>
          ))}
        </div>
      </div>

      {section === 0 ? <Warmup cards={warmupCards} lesson={lesson} onDone={(w) => go(1, { warmup: w })} /> : null}
      {section === 1 ? <DialogueSection lesson={lesson} analysis={analysis} onDone={() => go(2)} /> : null}
      {section === 2 ? <PhrasesSection lesson={lesson} added={!!prog.phrasesAdded} onDone={() => go(3, { phrasesAdded: true })} /> : null}
      {section === 3 ? <GrammarSection lesson={lesson} drills={drills} onDone={(d) => go(4, { drills: d })} /> : null}
      {section === 4 ? (
        <div className="card space-y-3">
          <SectionTitle i={4} />
          <WritingBox prompt={lesson.writing.prompt} promptTr={lesson.writing.promptTr} hints={lesson.writing.hints} lessonDate={lesson.date} />
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => go(5)}>
              Finish lesson · Dersi bitir →
            </button>
          </div>
        </div>
      ) : null}
      {section >= SECTIONS.length ? (
        <div className="card space-y-3 text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold">Ders bitti — aferin!</h2>
          <p className="text-muted">Lesson complete. The 5 new phrases are in your deck, and any writing corrections are in today&apos;s reviews.</p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {prog.warmup ? <span className="chip">Warm-up {prog.warmup.correct}/{prog.warmup.total}</span> : null}
            {prog.drills ? <span className="chip">Drills {prog.drills.correct}/{prog.drills.total}</span> : null}
          </div>
          <div className="flex justify-center gap-2">
            <Link href="/review" className="btn-ghost">
              Reviews
            </Link>
            <Link href="/" className="btn-primary">
              Back to Today
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ i }: { i: number }) {
  const s = SECTIONS[i];
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold">
        {i + 1}. {s.en} <span className="label-tr">· {s.tr}</span>
      </h2>
      <span className="text-xs text-muted">≈ {s.min} min</span>
    </div>
  );
}

// ---------------------------------------------------------------- 1. warm-up

function Warmup({ cards, lesson, onDone }: { cards: Card[]; lesson: DailyLesson; onDone: (w: { correct: number; total: number }) => void }) {
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

  return (
    <div className="card space-y-4">
      <SectionTitle i={0} />
      {cards.length === 0 ? (
        <p className="text-muted">No recent mistakes to recycle yet — great start! Let&apos;s go straight to the dialogue.</p>
      ) : !finished ? (
        <>
          <p className="text-sm text-muted">
            Recent mistakes, recycled · Son hatalar ({i + 1}/{cards.length})
          </p>
          <div className="text-2xl font-bold">{card.en}</div>
          <TypeAnswer key={card.id} resetKey={card.id} expected={card.tr} onChecked={checked}>
            <div className="flex items-center gap-3">
              <Speak text={card.tr} />
              <button
                className="btn-primary"
                autoFocus
                onClick={() => {
                  setAns(null);
                  setI(i + 1);
                }}
              >
                Next →
              </button>
            </div>
          </TypeAnswer>
        </>
      ) : (
        <p className="text-good">
          Warm-up done: {correct}/{cards.length} ✓
        </p>
      )}

      {lesson.leeches.length && (finished || cards.length === 0) ? (
        <div className="space-y-3 rounded-xl border border-warn bg-warn-soft p-3">
          <h3 className="font-semibold text-warn">Tricky words · Zor kelimeler</h3>
          {lesson.leeches.map((l) => (
            <div key={l.tr} className="space-y-1.5 rounded-lg bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{l.tr}</span> <Speak text={l.tr} /> <span className="text-muted">= {l.en}</span>
              </div>
              <p className="text-sm">🧠 {l.mnemonic}</p>
              <ul className="space-y-1 text-sm">
                {l.examples.map((e) => (
                  <li key={e.tr} className="flex items-start gap-2">
                    <Speak text={e.tr} className="!px-1.5 !py-0.5" />
                    <span>
                      {e.tr} <span className="text-muted">— {e.en}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {finished || cards.length === 0 ? (
        <button className="btn-primary" onClick={() => onDone({ correct, total: cards.length })} disabled={!!ans && !finished}>
          Continue to the dialogue →
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- 2. dialogue

function DialogueSection({ lesson, analysis, onDone }: { lesson: DailyLesson; analysis: Record<string, WordAnalysis>; onDone: () => void }) {
  const { speak, available } = useSpeech();
  const [showEn, setShowEn] = useState(false);
  const [selected, setSelected] = useState<{ line: number; key: string } | null>(null);
  const speakers = [...new Set(lesson.dialogue.lines.map((l) => l.speaker))];

  return (
    <div className="card space-y-4">
      <SectionTitle i={1} />
      <div className="rounded-xl bg-card-2 p-3 text-sm">
        📍 {lesson.dialogue.setting}
        {lesson.dialogue.settingTr ? <div className="text-muted">{lesson.dialogue.settingTr}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {available ? (
          <button className="btn-ghost" onClick={() => speak(lesson.dialogue.lines.map((l) => l.tr).join(" … "), 0.85)}>
            ▶ Play all · Hepsini dinle
          </button>
        ) : (
          <span className="text-xs text-muted">No Turkish voice installed — audio hidden (see Settings).</span>
        )}
        <button className="btn-ghost" onClick={() => setShowEn((v) => !v)}>
          {showEn ? "Hide English" : "Show English"}
        </button>
      </div>
      <p className="text-xs text-muted">Tap any word for its meaning and suffix breakdown · Kelimeye dokun.</p>
      <ol className="space-y-3">
        {lesson.dialogue.lines.map((l, i) => {
          const isMe = l.speaker.toLocaleLowerCase("tr-TR") === "sen";
          return (
            <li key={i} className={`flex ${isMe ? "justify-end" : ""}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-sea-soft" : "bg-card-2"}`}>
                <div className="mb-0.5 flex items-center justify-between gap-3 text-xs text-muted">
                  <span className={speakers.indexOf(l.speaker) % 2 ? "text-accent" : ""}>{l.speaker}</span>
                  <Speak text={l.tr} className="!px-1.5 !py-0.5" />
                </div>
                <div className="text-lg leading-relaxed">
                  <Tokens text={l.tr} line={i} analysis={analysis} selected={selected} onSelect={setSelected} />
                </div>
                {showEn ? <div className="text-sm text-muted">{l.en}</div> : null}
                {selected?.line === i && analysis[selected.key] ? <WordInfo a={analysis[selected.key]} /> : null}
                {selected?.line === i && !analysis[selected.key] ? (
                  <div className="mt-2 rounded-lg bg-card p-2 text-xs text-muted">No breakdown available for this word — see the English line.</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <button className="btn-primary" onClick={onDone}>
        Continue to new phrases →
      </button>
    </div>
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
            className={`rounded px-px ${isSel ? "bg-accent text-accent-fg" : known ? "underline decoration-sea/40 decoration-dotted underline-offset-4 hover:bg-card" : "hover:bg-card"}`}
          >
            {p}
          </button>
        );
      })}
    </>
  );
}

function WordInfo({ a }: { a: WordAnalysis }) {
  return (
    <div className="mt-2 space-y-1 rounded-lg bg-card p-2 text-sm">
      <div>
        <b>{a.word}</b> = {a.meaning}
        {a.description ? <span className="text-muted"> · {a.description}</span> : null}
      </div>
      {a.parts.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
          {a.parts.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 ? <span className="text-muted">+</span> : null}
              <span className={`rounded px-1 ${i === 0 ? "bg-card-2 font-bold" : "bg-sea-soft text-sea"}`}>{p}</span>
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
    <div className="card space-y-4">
      <SectionTitle i={2} />
      <ul className="space-y-3">
        {lesson.newPhrases.map((p) => (
          <li key={p.tr} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold">{p.tr}</span>
              <Speak text={p.tr} />
              <Speak text={p.tr} slow />
            </div>
            <div>{p.en}</div>
            {p.exTr ? (
              <div className="mt-1 text-sm">
                {p.exTr} <span className="text-muted">— {p.exEn}</span>
              </div>
            ) : null}
            {p.note ? <div className="mt-1 text-xs text-muted">💡 {p.note}</div> : null}
          </li>
        ))}
      </ul>
      <button
        className="btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          if (!added) await addLessonPhrasesAction(lesson.date);
          onDone();
        }}
      >
        {added ? "Continue →" : "Add to my deck & continue · Desteme ekle →"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- 4. grammar

function GrammarSection({ lesson, drills, onDone }: { lesson: DailyLesson; drills: Drill[]; onDone: (d: { correct: number; total: number }) => void }) {
  const [practice, setPractice] = useState(false);
  return (
    <div className="card space-y-4">
      <SectionTitle i={3} />
      <div>
        <h3 className="text-xl font-bold">{lesson.grammar.title}</h3>
        <p className="mt-2 leading-relaxed">{lesson.grammar.explanation}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {lesson.grammar.examples.map((e) => (
          <div key={e.tr} className="flex items-center justify-between gap-2 rounded-xl bg-card-2 px-3 py-2">
            <div>
              <div className="font-semibold">{e.tr}</div>
              <div className="text-xs text-muted">
                {e.en}
                {e.breakdown ? ` · ${e.breakdown}` : ""}
              </div>
            </div>
            <Speak text={e.tr} />
          </div>
        ))}
      </div>
      {!practice ? (
        <button className="btn-primary" onClick={() => setPractice(true)}>
          Practise: {drills.length} suffix drills →
        </button>
      ) : (
        <DrillSet
          drills={drills}
          context="lesson"
          onFinish={(o) => onDone({ correct: o.filter((x) => x.result === "correct").length, total: o.length })}
        />
      )}
    </div>
  );
}
