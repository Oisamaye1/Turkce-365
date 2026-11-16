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

/** Underlines the letters that were missing from an almost-right answer. */
export function LetterDiff({ given, expected }: { given: string; expected: string }) {
  const parts = diffChars(normalizeAnswer(given), normalizeAnswer(expected));
  return (
    <span className="tr-word text-[21px]">
      {parts.map((p, i) =>
        p.removed ? null : (
          <span key={i} className={p.added ? "rounded-sm bg-warn/30 underline decoration-warn decoration-2 underline-offset-4" : ""}>
            {p.value}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * Typed answer with a feedback panel.
 * - `sheet="fixed"`: the Check button and feedback sit in a bar pinned to the bottom (focus mode).
 * - `sheet="inline"`: the same panel sits under the input (pages with navigation).
 * Children are the actions shown after checking; the first should be the primary one.
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
  details?: React.ReactNode;
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
  const formId = `ta-${resetKey ?? "x"}`;

  const feedback =
    result && copy ? (
      <div className="flex min-w-0 items-start gap-3" role="status" aria-live="polite">
        <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${copy.dot} text-white`}>
          {result.result === "wrong" ? <IconX size={16} /> : <IconCheck size={16} />}
        </span>
        <div className="min-w-0">
          <p className={`font-display text-[21px] leading-tight font-semibold ${copy.text}`}>
            {copy.title}
            <span className="ml-2 text-[15px] font-normal opacity-75" lang="tr">
              {copy.tr}
            </span>
          </p>
          {!exact ? (
            <div className="mt-1">
              {result.result === "correct" ? (
                <p className="text-ink-soft">
                  Also right: <span className="tr-word">{result.expected}</span>
                </p>
              ) : (
                <>
                  <p className="text-[14px] text-ink-soft">
                    {result.reason === "missing-turkish-letters"
                      ? "Spelling counts — the Turkish letters are missing:"
                      : result.reason === "typo"
                        ? "One small typo:"
                        : "The answer is:"}
                  </p>
                  {lang === "tr" && value.trim() && result.result === "almost" ? (
                    <LetterDiff given={value} expected={result.expected} />
                  ) : (
                    <p className="tr-word text-[21px]">{result.expected}</p>
                  )}
                </>
              )}
            </div>
          ) : null}
          {details ? <div className="mt-3 text-ink">{details}</div> : null}
        </div>
      </div>
    ) : null;

  const actions = (
    <div className="flex shrink-0 flex-wrap justify-end gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
      {result ? (
        children
      ) : (
        <button className="btn-primary w-full sm:w-40" type="submit" form={formId} disabled={!value.trim()}>
          Check
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={input}
          className={`input font-display !py-3.5 !text-[24px] font-medium tracking-tight ${
            result ? (result.result === "correct" ? "!border-ok" : result.result === "almost" ? "!border-warn" : "!border-bad") : ""
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

      {sheet === "fixed" ? (
        <>
          <div className="h-44" aria-hidden="true" />
          <div
            className={`fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] ${result ? `${copy!.tint} border-transparent` : "border-line bg-paper/95 backdrop-blur"}`}
            style={result ? { animation: "sheet-up 200ms ease-out" } : undefined}
          >
            <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              {feedback ?? <span className="hidden sm:block" />}
              {actions}
            </div>
          </div>
        </>
      ) : (
        <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${result ? `rounded-[14px] p-4 ${copy!.tint}` : ""}`}>
          {feedback ?? <span className="hidden sm:block" />}
          {actions}
        </div>
      )}
    </div>
  );
}
