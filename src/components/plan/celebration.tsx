"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { IconArrow } from "../icons";

const COLORS = ["var(--accent)", "var(--brand)", "var(--ok)", "var(--warn)"];

/** Deterministic burst so server and client never disagree. */
const PIECES = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2 + (i % 2 ? 0.12 : -0.08);
  const dist = 120 + ((i * 37) % 90);
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist * 0.8 - 20),
    r: ((i * 73) % 360) - 180,
    c: COLORS[i % COLORS.length],
    round: i % 3 === 0,
    delay: (i % 5) * 18,
  };
});

/** The moment a plan day is closed: one orchestrated burst, then what's next. */
export function Celebration({
  day,
  weekDone,
  weekTitle,
  next,
  finishedToday,
  onClose,
}: {
  day: number;
  weekDone: boolean;
  weekTitle: string;
  next: { day: number; title: string; weekTitle: string } | null;
  finishedToday: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const heading = day >= 365 ? "Mezun oldun." : weekDone ? "Hafta tamam." : "Gün tamam.";
  const sub =
    day >= 365
      ? "You finished the whole year. Tebrikler!"
      : weekDone
        ? `Week finished: ${weekTitle}. Aferin!`
        : `Day ${day} is done. Aferin!`;

  return (
    <div className="fixed inset-0 z-50 grid animate-fade place-items-center bg-paper/90 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="celebrate-h">
      <div className="relative w-full max-w-[460px] text-center">
        <div className="relative mx-auto grid h-24 w-24 place-items-center" aria-hidden="true">
          {PIECES.map((p, i) => (
            <span
              key={i}
              className={`absolute top-1/2 left-1/2 -mt-1 -ml-1 h-2 w-2 motion-reduce:hidden ${p.round ? "rounded-full" : "rounded-[2px]"}`}
              style={
                {
                  background: p.c,
                  "--x": `${p.x}px`,
                  "--y": `${p.y}px`,
                  "--r": `${p.r}deg`,
                  animation: `burst 900ms cubic-bezier(0.22, 1, 0.36, 1) ${p.delay}ms both`,
                } as React.CSSProperties
              }
            />
          ))}
          <span className="grid h-24 w-24 animate-pop place-items-center rounded-full bg-ok text-white">
            <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="check-draw">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        </div>
        <h2 id="celebrate-h" className="display-xl mt-8 animate-rise text-[52px]" lang="tr" style={{ animationDelay: "120ms" }}>
          {heading}
        </h2>
        <p className="mt-3 animate-rise text-[17px] text-ink-soft" style={{ animationDelay: "180ms" }}>
          {sub}
          {finishedToday > 1 ? ` That's ${finishedToday} days today.` : ""}
        </p>
        {next && day < 365 ? (
          <div className="mt-8 animate-rise rounded-[14px] border border-line bg-paper p-5 text-left" style={{ animationDelay: "240ms" }}>
            <p className="text-[14px] text-muted">
              Next: day {next.day}, {next.weekTitle}
            </p>
            <p className="font-display mt-1 text-[21px] font-semibold">{next.title}</p>
            <p className="mt-1 text-[15px] text-ink-soft">
              {finishedToday >= 2 ? "You've done plenty today. It'll be waiting for you tomorrow." : "Come back tomorrow, or keep going now if you have energy."}
            </p>
          </div>
        ) : null}
        <div className="mt-6 flex animate-rise flex-wrap justify-center gap-3" style={{ animationDelay: "300ms" }}>
          <button ref={closeRef} className="btn-primary" onClick={onClose}>
            {next && day < 365 ? "See tomorrow" : "Close"}
          </button>
          <Link href="/plan" className="btn-secondary" onClick={onClose}>
            View the plan <IconArrow size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
