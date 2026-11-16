"use client";

import { useRef, useState } from "react";
import { retryCorrectionAction, submitWritingAction, type WritingResult } from "@/app/actions";
import { CorrectionView } from "./correction-view";
import { TurkishKeyboard } from "./keyboard";

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
    <div className="space-y-5">
      <div>
        <p className="font-display text-[26px] leading-snug font-semibold">{prompt}</p>
        {promptTr ? (
          <p className="mt-1 text-ink-soft" lang="tr">
            {promptTr}
          </p>
        ) : null}
      </div>
      {hints.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] text-muted">Start with</span>
          {hints.map((h) => (
            <button
              key={h}
              type="button"
              disabled={!!res}
              onClick={() => setText((t) => (t ? `${t} ${h}` : h))}
              className="rounded-lg border border-line-strong px-2.5 py-1 text-[15px] text-ink hover:bg-haze"
              lang="tr"
            >
              {h}
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        ref={area}
        className="input min-h-44 leading-relaxed"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Türkçe yaz — three to five sentences"
        lang="tr"
        spellCheck={false}
        disabled={busy || !!res}
        aria-label="Your Turkish text"
      />
      {!res ? <TurkishKeyboard target={area} /> : null}

      {res?.queued ? (
        <div className="rounded-[14px] bg-brand-tint p-4" role="status">
          <p className="font-medium text-brand-text">Saved and queued for correction</p>
          <p className="mt-1 text-[15px] text-ink-soft">
            Claude runs on your computer and picks this up within about 15 minutes while it&apos;s on. The corrected text appears under Write, and each
            error becomes a card in today&apos;s reviews.
          </p>
        </div>
      ) : null}
      {res?.error ? (
        <p className="rounded-[14px] bg-warn-tint p-4 text-[15px] text-ink" role="alert">
          {res.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
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
          <span className="text-[14px] text-muted tabular">
            {sentences} sentence{sentences === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
