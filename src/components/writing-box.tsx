"use client";

import { useRef, useState } from "react";
import { submitWritingAction, retryCorrectionAction, type WritingResult } from "@/app/actions";
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

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-sea-soft p-3">
        <div className="font-semibold">{prompt}</div>
        {promptTr ? <div className="text-sm text-muted">{promptTr}</div> : null}
        {hints.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hints.map((h) => (
              <span key={h} className="chip !bg-card">
                {h}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {!res?.correction ? (
        <>
          <textarea
            ref={area}
            className="input min-h-36 !text-base"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Türkçe yaz… (3–5 sentences)"
            lang="tr"
            spellCheck={false}
            disabled={busy || !!res}
          />
          {!res ? <TurkishKeyboard target={area} /> : null}
          <div className="flex flex-wrap items-center gap-3">
            {res?.queued ? null : !res ? (
              <button className="btn-primary" disabled={busy || text.trim().length < 3} onClick={submit}>
                {busy ? "Correcting… (≈ 30–60 s)" : "Submit · Gönder"}
              </button>
            ) : (
              <button className="btn-primary" disabled={busy} onClick={retry}>
                {busy ? "Correcting…" : "Retry correction · Tekrar dene"}
              </button>
            )}
            <span className="text-xs text-muted">{sentences} sentence{sentences === 1 ? "" : "s"}</span>
          </div>
          {res?.error ? <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{res.error}</p> : null}
          {res?.queued ? (
            <div className="rounded-xl border border-sea bg-sea-soft p-3 text-sm">
              <div className="font-semibold text-sea">✓ Saved — correction queued · Sıraya alındı</div>
              <p className="mt-1">
                Claude runs on your computer: the worker picks this up within ~15 minutes while the computer is on. The corrected text appears in{" "}
                <b>Write → Past writing</b>, and every error becomes a card in today&apos;s reviews.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <CorrectionView mine={text || ""} correction={res.correction} cardsAdded={res.cardsAdded} />
      )}
    </div>
  );
}
