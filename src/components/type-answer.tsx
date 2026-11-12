"use client";

import { diffChars } from "diff";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconX } from "./icons";
import { TurkishKeyboard } from "./keyboard";
import { RESULT_COPY } from "./ui";
import { checkEnglish, checkTurkish, type CheckOutcome } from "@/lib/turkish/answer";
import { normalizeAnswer } from "@/lib/turkish/text";

export interface AnswerResult extends CheckOutcome {
  given: string;
  ms: number;
}

/** Highlights the letters that were missing or wrong in the expected answer. */
export function LetterDiff({ given, expected }: { given: string; expected: string }) {
  const parts = diffChars(normalizeAnswer(given), normalizeAnswer(expected));
  return (
    <span className="font-display text-xl font-bold">
      {parts.map((p, i) =>
        p.removed ? null : (
          <span key={i} className={p.added ? "rounded-md bg-cay/40 px-0.5 underline decoration-2 underline-offset-4" : ""}>
            {p.value}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * Typed answer with a Duolingo-style feedback sheet.
 * - `sheet="fixed"`: the Check button and feedback live in a bar pinned to the bottom (focus mode).
 * - `sheet="inline"`: the same bar sits under the input (pages with navigation).
 * The parent passes the actions shown after checking (Continue, grades…) as children.
 */
export function TypeAnswer({
  expected,
  alternatives = [],
  lang = "tr",
  strict = false,
  placeholder,
  onChecked,
  autoFocus = true,
  resetKey,
  sheet = "inline",
  details,
  children,
}: {
  expected: string;
  alternatives?: string[];
  lang?: "tr" | "en";
  strict?: boolean;
  placeholder?: string;
  onChecked: (r: AnswerResult) => void;
  autoFocus?: boolean;
  resetKey?: string | number;
  sheet?: "fixed" | "inline";
  /** Extra content inside the feedback sheet (examples, breakdowns). */
  details?: React.ReactNode;
  /** Actions after checking — the first button should be the primary one. */
  children?: React.ReactNode;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const started = useRef(Date.now());
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    setResult(null);
    started.current = Date.now();
    if (autoFocus) setTimeout(() => input.current?.focus(), 30);
  }, [resetKey, autoFocus]);

  const submit = () => {
    if (result || !value.trim()) return;
    const outcome =
      lang === "tr" ? checkTurkish(value, [expected, ...alternatives], { typoTolerance: !strict }) : checkEnglish(value, expected);
    const r: AnswerResult = { ...outcome, given: value, ms: Date.now() - started.current };
    setResult(r);
    onChecked(r);
  };

  const copy = result ? RESULT_COPY[result.result] : null;
  const exact = result?.result === "correct" && normalizeAnswer(result.expected) === normalizeAnswer(value);

  const bar = (
    <div
      className={
        sheet === "fixed"
          ? `fixed inset-x-0 bottom-0 z-40 border-t-2 ${result ? `${copy!.sheet} border-transparent` : "border-line bg-paper"} pb-[env(safe-area-inset-bottom)]`
          : `rounded-3xl ${result ? copy!.sheet : ""}`
      }
      style={result && sheet === "fixed" ? { animation: "sheet-up 180ms ease-out" } : undefined}
    >
      <div className={`mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${sheet === "fixed" ? "px-4 py-5 sm:px-6" : result ? "p-4" : ""}`}>
        {result && copy ? (
          <div className="flex min-w-0 items-start gap-3" role="status" aria-live="polite">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-paper ${copy.text}`} style={{ animation: "pop 260ms ease-out" }}>
              {result.result === "wrong" ? <IconX size={26} /> : <IconCheck size={26} />}
            </span>
            <div className="min-w-0">
              <div className={`font-display text-2xl leading-tight font-extrabold ${copy.text}`}>
                {copy.tr} <span className="text-base font-bold opacity-80">{copy.title}</span>
              </div>
              {!exact ? (
                <div className={`mt-0.5 ${copy.text}`}>
                  {result.result === "correct" ? (
                    <span>
                      Also accepted: <b>{result.expected}</b>
                    </span>
                  ) : (
                    <>
                      <div className="text-sm font-semibold">
                        {result.reason === "missing-turkish-letters"
                          ? "Spelling counts — check the Turkish letters:"
                          : result.reason === "typo"
                            ? "One small typo:"
                            : "Correct answer:"}
                      </div>
                      <div className="text-ink">
                        {lang === "tr" && value.trim() && result.result === "almost" ? <LetterDiff given={value} expected={result.expected} /> : <b className="font-display text-xl">{result.expected}</b>}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
              {details ? <div className="mt-2 text-ink">{details}</div> : null}
            </div>
          </div>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex shrink-0 flex-wrap justify-end gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {result ? (
            children
          ) : (
            <button className="btn-primary w-full sm:w-44" type="submit" form={`ta-${resetKey ?? "x"}`} disabled={!value.trim()}>
              Check
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <form
        id={`ta-${resetKey ?? "x"}`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={input}
          className={`input font-display !text-2xl font-bold ${
            result ? (result.result === "correct" ? "!border-zeytin" : result.result === "almost" ? "!border-cay" : "!border-nar") : ""
          }`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? (lang === "tr" ? "Türkçe yaz" : "Type in English")}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          lang={lang === "tr" ? "tr" : "en"}
          readOnly={!!result}
          aria-label="Your answer"
        />
      </form>
      {lang === "tr" && !result ? <TurkishKeyboard target={input} /> : null}
      {sheet === "fixed" ? <div className="h-40" aria-hidden="true" /> : null}
      {bar}
    </div>
  );
}
