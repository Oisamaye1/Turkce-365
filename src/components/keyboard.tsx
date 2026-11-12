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

/** Chunky letter keys for ç ğ ı İ ö ş ü (for English keyboards). */
export function TurkishKeyboard({ target, className = "" }: { target?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>; className?: string }) {
  const [shift, setShift] = useState(false);
  const keys = shift ? UPPER : LOWER;
  const press = (k: string) => {
    const active = document.activeElement;
    const el = target?.current ?? (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null);
    if (!el) return;
    el.focus();
    insertAtCursor(el, k);
    if (shift) setShift(false);
  };
  const key =
    "font-display grid h-11 min-w-11 place-items-center rounded-xl border-2 border-line bg-paper px-2 text-xl font-bold text-ink shadow-[0_3px_0_var(--line)] active:translate-y-[3px] active:shadow-none";
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="Turkish letters">
      {keys.map((k) => (
        <button key={k} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => press(k)} className={key}>
          {k}
        </button>
      ))}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShift((s) => !s)}
        className={`${key} ${shift ? "!border-kobalt !text-kobalt" : "text-muted"}`}
        aria-pressed={shift}
        aria-label="Capital letters"
      >
        ⇧
      </button>
    </div>
  );
}
