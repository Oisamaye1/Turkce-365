"use client";

import { useRef, useState } from "react";
import { retryCorrectionAction, submitWritingAction, type WritingResult } from "@/app/actions";
import { CorrectionView } from "./correction-view";
import { TurkishKeyboard } from "./keyboard";
import { Simit } from "./simit";
import { SpeechBubble } from "./ui";

export function WritingBox({
  prompt,
  promptTr,
  hints = [],
  lessonDate,
  onCorrected,
}: {
  prompt: string;
  promptTr?: string;
  hints?: string[];
  lessonDate?: string;
  onCorrected?: (r: WritingResult) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<WritingResult | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().split(/\s+/).length >= 2).length;

  const submit = async () => {
    setBusy(true);
    const r = await submitWritingAction({ prompt, text, lessonDate });
    setRes(r);
    setBusy(false);
    onCorrected?.(r);
  };
  const retry = async () => {
    if (!res) return;
    setBusy(true);
    const r = await retryCorrectionAction(res.writingId);
    setRes(r);
    setBusy(false);
    onCorrected?.(r);
  };

  if (res?.correction) return <CorrectionView mine={text} correction={res.correction} cardsAdded={res.cardsAdded} />;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Simit size={84} className="shrink-0" mood={res?.queued ? "happy" : "calm"} />
        <SpeechBubble className="flex-1">
          <p className="font-medium">{prompt}</p>
          {promptTr ? (
            <p className="mt-1 text-sm text-muted" lang="tr">
              {promptTr}
            </p>
          ) : null}
        </SpeechBubble>
      </div>
      {hints.length ? (
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-sm text-muted">Start with:</span>
          {hints.map((h) => (
            <button
              key={h}
              type="button"
              disabled={!!res}
              onClick={() => setText((t) => (t ? `${t} ${h}` : h))}
              className="font-display rounded-xl border-2 border-b-4 border-line px-3 py-1 font-bold text-ink-soft hover:bg-wash"
              lang="tr"
            >
              {h}
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        ref={area}
        className="input min-h-40 !text-lg"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Türkçe yaz… three to five sentences"
        lang="tr"
        spellCheck={false}
        disabled={busy || !!res}
        aria-label="Your Turkish text"
      />
      {!res ? <TurkishKeyboard target={area} /> : null}

      {res?.queued ? (
        <div className="rounded-3xl bg-turkuaz-tint p-4" role="status">
          <p className="font-display text-xl font-extrabold text-turkuaz-depth">Saved — queued for correction</p>
          <p className="mt-1 text-ink">
            Claude runs on your computer, which picks this up within about 15 minutes while it&apos;s on. The corrected text appears under Write, and every
            error becomes a card in today&apos;s reviews.
          </p>
        </div>
      ) : null}
      {res?.error ? (
        <div className="rounded-3xl bg-cay-tint p-4 text-ink" role="alert">
          {res.error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {!res ? (
          <button className="btn-primary" disabled={busy || text.trim().length < 3} onClick={submit}>
            {busy ? "Checking your Turkish…" : "Check my writing"}
          </button>
        ) : res.error ? (
          <button className="btn-primary" disabled={busy} onClick={retry}>
            {busy ? "Checking…" : "Try the correction again"}
          </button>
        ) : null}
        {!res ? (
          <span className="text-sm text-muted">
            {sentences} sentence{sentences === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
