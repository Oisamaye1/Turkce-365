"use client";

import { diffWords } from "diff";
import type { Correction } from "@/lib/lesson/schema";
import { Simit } from "./simit";
import { Speak } from "./speech";

/** Word-level diff between the learner's text and the corrected text. */
export function TextDiff({ mine, corrected }: { mine: string; corrected: string }) {
  const parts = diffWords(mine, corrected);
  return (
    <p className="text-lg leading-loose" lang="tr">
      {parts.map((p, i) =>
        p.added ? (
          <ins key={i} className="rounded-md bg-zeytin-tint px-1 font-semibold text-zeytin-depth no-underline">
            {p.value}
          </ins>
        ) : p.removed ? (
          <del key={i} className="rounded-md bg-nar-tint px-1 text-nar-depth">
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
  const tone = s >= 8 ? "text-zeytin-depth border-zeytin" : s >= 5 ? "text-cay-depth border-cay" : "text-nar-depth border-nar";
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Simit size={84} mood={s >= 8 ? "proud" : s >= 5 ? "happy" : "oops"} className="shrink-0" />
        <div className={`font-display grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 text-3xl font-extrabold ${tone}`} aria-label={`Score ${s} out of 10`}>
          {s}
        </div>
        <p className="min-w-0 text-ink">{correction.comment}</p>
      </div>

      <section className="card">
        <h3 className="font-display text-lg font-extrabold">What changed</h3>
        <p className="mb-2 text-sm text-muted">Red was removed, green was added.</p>
        <TextDiff mine={mine} corrected={correction.corrected} />
      </section>

      <section className="flex items-start gap-3 rounded-3xl bg-wash p-4">
        <Speak text={correction.corrected} />
        <div className="min-w-0">
          <p className="text-sm text-muted">Corrected version</p>
          <p className="text-lg font-medium" lang="tr">
            {correction.corrected}
          </p>
        </div>
      </section>

      {correction.errors.length ? (
        <section className="space-y-3">
          <h3 className="font-display text-lg font-extrabold">
            {correction.errors.length} thing{correction.errors.length > 1 ? "s" : ""} to fix
          </h3>
          {correction.errors.map((e, i) => (
            <div key={i} className="rounded-3xl border-2 border-line p-4">
              <div className="flex flex-wrap items-center gap-2" lang="tr">
                <span className="font-display rounded-xl bg-nar-tint px-2.5 py-1 font-bold text-nar-depth line-through">{e.original}</span>
                <span className="text-muted" aria-hidden="true">
                  becomes
                </span>
                <span className="font-display rounded-xl bg-zeytin-tint px-2.5 py-1 font-bold text-zeytin-depth">{e.correction}</span>
                <span className="rounded-full bg-turkuaz-tint px-2.5 py-0.5 text-xs font-semibold text-turkuaz-depth">{e.rule}</span>
              </div>
              <p className="mt-2 text-ink-soft">{e.explanationEN}</p>
            </div>
          ))}
          {cardsAdded ? (
            <p className="font-medium text-turkuaz-depth">
              {cardsAdded} correction card{cardsAdded > 1 ? "s" : ""} added to today&apos;s reviews.
            </p>
          ) : null}
        </section>
      ) : (
        <p className="font-display text-xl font-extrabold text-zeytin-depth">No mistakes — mükemmel!</p>
      )}
    </div>
  );
}
