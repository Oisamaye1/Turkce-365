"use client";

import { diffChars } from "diff";
import { useEffect, useRef, useState } from "react";
import { TurkishKeyboard } from "./keyboard";
import { ResultBanner } from "./ui";
import { checkEnglish, checkTurkish, type CheckOutcome } from "@/lib/turkish/answer";
import { normalizeAnswer } from "@/lib/turkish/text";

export interface AnswerResult extends CheckOutcome {
  given: string;
  ms: number;
}

/** Shows which letters differ between what was typed and the expected answer. */
export function LetterDiff({ given, expected }: { given: string; expected: string }) {
  const parts = diffChars(normalizeAnswer(given), normalizeAnswer(expected));
  return (
    <span className="font-mono text-lg">
      {parts.map((p, i) =>
        p.removed ? null : (
          <span key={i} className={p.added ? "rounded bg-good-soft font-bold text-good underline decoration-2" : ""}>
            {p.value}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * Text input + Turkish keyboard + answer checking.
 * Calls onChecked once with the outcome; the parent decides what happens next.
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
  children,
}: {
  expected: string;
  alternatives?: string[];
  lang?: "tr" | "en";
  /** Suffix drills: no typo tolerance. */
  strict?: boolean;
  placeholder?: string;
  onChecked: (r: AnswerResult) => void;
  autoFocus?: boolean;
  /** Change to reset the input for the next item. */
  resetKey?: string | number;
  /** Rendered under the result (e.g. grade buttons). */
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
    if (result) return;
    const outcome =
      lang === "tr"
        ? checkTurkish(value, [expected, ...alternatives], { typoTolerance: !strict })
        : checkEnglish(value, expected);
    const r: AnswerResult = { ...outcome, given: value, ms: Date.now() - started.current };
    setResult(r);
    onChecked(r);
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2"
      >
        <input
          ref={input}
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? (lang === "tr" ? "Type in Turkish · Türkçe yaz" : "Type in English")}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          lang={lang === "tr" ? "tr" : "en"}
          readOnly={!!result}
          aria-label="Your answer"
        />
        {!result ? (
          <button className="btn-primary shrink-0" type="submit">
            Check
          </button>
        ) : null}
      </form>
      {lang === "tr" && !result ? <TurkishKeyboard target={input} /> : null}
      {result ? (
        <ResultBanner result={result.result}>
          {result.result === "correct" ? (
            result.expected !== value.trim() && normalizeAnswer(result.expected) !== normalizeAnswer(value) ? (
              <span>
                Accepted. Also: <b>{result.expected}</b>
              </span>
            ) : null
          ) : (
            <div className="space-y-1">
              {result.reason === "missing-turkish-letters" ? <div className="text-sm">Only the Turkish letters are missing — spelling matters:</div> : null}
              {result.reason === "typo" ? <div className="text-sm">One small typo:</div> : null}
              <div>
                {lang === "tr" && value.trim() ? <LetterDiff given={value} expected={result.expected} /> : <b className="text-lg">{result.expected}</b>}
              </div>
              {value.trim() ? (
                <div className="text-xs text-muted">
                  You typed: <span className="line-through">{value}</span>
                </div>
              ) : null}
            </div>
          )}
        </ResultBanner>
      ) : null}
      {result ? children : null}
    </div>
  );
}
