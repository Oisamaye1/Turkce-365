"use client";

import { diffWords } from "diff";
import type { Correction } from "@/lib/lesson/schema";
import { Speak } from "./speech";

/** Word-level diff between the learner's text and the corrected text. */
export function TextDiff({ mine, corrected }: { mine: string; corrected: string }) {
  const parts = diffWords(mine, corrected);
  return (
    <p className="text-[19px] leading-loose" lang="tr">
      {parts.map((p, i) =>
        p.added ? (
          <ins key={i} className="rounded-sm bg-ok-tint px-0.5 text-ok-text no-underline">
            {p.value}
          </ins>
        ) : p.removed ? (
          <del key={i} className="rounded-sm bg-bad-tint px-0.5 text-bad-text decoration-1">
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
  const s = correction.score;
  const tone = s >= 8 ? "text-ok-text" : s >= 5 ? "text-warn-text" : "text-bad-text";
  return (
    <div className="space-y-10">
      <div className="flex items-start gap-6">
        <p className={`font-display text-[64px] leading-none font-semibold tabular ${tone}`} aria-label={`Score ${s} out of 10`}>
          {s}
          <span className="text-[21px] text-muted">/10</span>
        </p>
        <p className="max-w-[48ch] pt-2 text-[17px] text-ink">{correction.comment}</p>
      </div>

      <section>
        <h3 className="font-display text-[21px] font-semibold">What changed</h3>
        <p className="mb-3 text-[14px] text-muted">Red was removed, green was added.</p>
        <TextDiff mine={mine} corrected={correction.corrected} />
      </section>

      <section className="border-l-2 border-ok pl-5">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] text-muted">Corrected version</h3>
          <Speak text={correction.corrected} size="sm" />
        </div>
        <p className="tr-word mt-1 text-[21px] leading-relaxed font-medium" lang="tr">
          {correction.corrected}
        </p>
      </section>

      {correction.errors.length ? (
        <section>
          <h3 className="font-display text-[21px] font-semibold">
            {correction.errors.length} thing{correction.errors.length > 1 ? "s" : ""} to fix
          </h3>
          <ol className="mt-3 divide-y divide-line border-y border-line">
            {correction.errors.map((e, i) => (
              <li key={i} className="py-4">
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1" lang="tr">
                  <span className="text-bad-text line-through decoration-1">{e.original}</span>
                  <span className="text-muted" aria-label="becomes">
                    →
                  </span>
                  <span className="font-medium text-ok-text">{e.correction}</span>
                  <span className="pill bg-haze text-ink-soft">{e.rule}</span>
                </p>
                <p className="mt-1.5 max-w-[62ch] text-[15px] text-ink-soft">{e.explanationEN}</p>
              </li>
            ))}
          </ol>
          {cardsAdded ? (
            <p className="mt-3 text-[15px] text-brand-text">
              {cardsAdded} correction card{cardsAdded > 1 ? "s were" : " was"} added to today&apos;s reviews.
            </p>
          ) : null}
        </section>
      ) : (
        <p className="font-display text-[21px] font-semibold text-ok-text">No mistakes. Mükemmel.</p>
      )}
    </div>
  );
}
