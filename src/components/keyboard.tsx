"use client";

import { useState } from "react";

const LOWER = ["ç", "ğ", "ı", "İ", "ö", "ş", "ü"];
const UPPER = ["Ç", "Ğ", "I", "İ", "Ö", "Ş", "Ü"];

/** Insert text at the caret of an input/textarea, firing React's onChange. */
export function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const pos = start + text.length;
  el.setSelectionRange(pos, pos);
}

/**
 * On-screen buttons for the Turkish letters (for English keyboards).
 * Types into the focused field, or into `target` when given.
 */
export function TurkishKeyboard({ target, className = "" }: { target?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>; className?: string }) {
  const [shift, setShift] = useState(false);
  const keys = shift ? UPPER : LOWER;
  const press = (k: string) => {
    const active = document.activeElement;
    const el =
      target?.current ??
      (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null);
    if (!el) return;
    el.focus();
    insertAtCursor(el, k);
    if (shift) setShift(false);
  };
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Turkish letters">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => press(k)}
          className="min-w-10 rounded-lg border border-border bg-card px-2.5 py-2 text-lg font-semibold hover:bg-sea-soft active:scale-95"
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShift((s) => !s)}
        className={`rounded-lg border px-2.5 py-2 text-sm ${shift ? "border-sea bg-sea-soft" : "border-border bg-card"}`}
        aria-pressed={shift}
        title="Capital letters"
      >
        ⇧
      </button>
    </div>
  );
}
