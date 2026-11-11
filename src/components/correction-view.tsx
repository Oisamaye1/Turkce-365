"use client";

import { diffWords } from "diff";
import type { Correction } from "@/lib/lesson/schema";
import { Speak } from "./speech";
import { Badge } from "./ui";

/** Word-level diff between the learner's text and the corrected text. */
export function TextDiff({ mine, corrected }: { mine: string; corrected: string }) {
  const parts = diffWords(mine, corrected);
  return (
    <p className="leading-loose">
      {parts.map((p, i) =>
        p.added ? (
          <ins key={i} className="rounded bg-good-soft px-0.5 text-good no-underline">
            {p.value}
          </ins>
        ) : p.removed ? (
          <del key={i} className="rounded bg-bad-soft px-0.5 text-bad">
            {p.value}
          </del>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </p>
  );
}

export function CorrectionView({ mine, correction, cardsAdded }: { mine: string; correction: Correction; cardsAdded?: number }) {
  const tone = correction.score >= 8 ? "good" : correction.score >= 5 ? "warn" : "bad";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className={`rounded-2xl px-4 py-2 text-2xl font-bold ${tone === "good" ? "bg-good-soft text-good" : tone === "warn" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`}>
          {correction.score}/10
        </div>
        <p className="min-w-0 flex-1">{correction.comment}</p>
      </div>
      <div className="rounded-xl border border-border p-3">
        <div className="mb-1 text-xs text-muted">Your text vs corrected · Senin metnin ve düzeltilmiş hali</div>
        <TextDiff mine={mine} corrected={correction.corrected} />
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-card-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">Corrected · Düzeltilmiş</div>
          <div className="font-medium">{correction.corrected}</div>
        </div>
        <Speak text={correction.corrected} />
      </div>
      {correction.errors.length ? (
        <div className="space-y-2">
          <h3 className="font-semibold">
            Errors · Hatalar ({correction.errors.length})
          </h3>
          {correction.errors.map((e, i) => (
            <div key={i} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-bad line-through">{e.original}</span>
                <span>→</span>
                <span className="font-semibold text-good">{e.correction}</span>
                <Badge tone="sea">{e.rule}</Badge>
              </div>
              <p className="mt-1 text-muted">{e.explanationEN}</p>
            </div>
          ))}
          {cardsAdded ? (
            <p className="text-sm text-sea">
              ✓ {cardsAdded} correction card{cardsAdded > 1 ? "s" : ""} added to today&apos;s reviews.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-good">No errors — mükemmel! 🎉</p>
      )}
    </div>
  );
}
