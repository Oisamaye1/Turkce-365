"use client";

import { useMemo, useState, useTransition } from "react";
import { learnWordNowAction } from "@/app/actions";
import type { DictionaryWord } from "@/lib/db/cards";
import { normalizeAnswer } from "@/lib/turkish/text";
import { Speak } from "../speech";

type Status = "all" | "new" | "learning" | "known";
const PAGE = 60;

function status(w: DictionaryWord): Exclude<Status, "all"> {
  return w.reps === null ? "new" : w.reps >= 3 ? "known" : "learning";
}

export function Dictionary({ words, units }: { words: DictionaryWord[]; units: { unit: number; title: string }[] }) {
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState(0);
  const [st, setSt] = useState<Status>("all");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    const c = { new: 0, learning: 0, known: 0 };
    for (const w of words) c[status(w)]++;
    return c;
  }, [words]);

  const list = useMemo(() => {
    const n = normalizeAnswer(q);
    return words.filter(
      (w) =>
        (!unit || w.unit === unit) &&
        (st === "all" || status(w) === st || (st === "learning" && added.has(w.id))) &&
        (!n || normalizeAnswer(w.tr).includes(n) || normalizeAnswer(w.en).includes(n)),
    );
  }, [words, q, unit, st, added]);

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          className="input"
          placeholder="Search in Turkish or English"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          spellCheck={false}
          aria-label="Search words"
        />
        <select
          className="input sm:!w-64"
          value={unit}
          onChange={(e) => {
            setUnit(Number(e.target.value));
            setLimit(PAGE);
          }}
          aria-label="Unit"
        >
          <option value={0}>All {units.length} units</option>
          {units.map((u) => (
            <option key={u.unit} value={u.unit}>
              {u.unit}. {u.title}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
        {(
          [
            ["all", `All ${words.length}`],
            ["new", `Not started ${counts.new}`],
            ["learning", `Learning ${counts.learning}`],
            ["known", `Known ${counts.known}`],
          ] as [Status, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            role="radio"
            aria-checked={st === v}
            onClick={() => {
              setSt(v);
              setLimit(PAGE);
            }}
            className={`rounded-full border px-3 py-1.5 text-[14px] tabular transition-colors ${st === v ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft hover:bg-haze"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[13px] text-muted tabular">
        {list.length} word{list.length === 1 ? "" : "s"}
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {list.slice(0, limit).map((w) => {
          const s = added.has(w.id) ? "learning" : status(w);
          const isOpen = open === w.id;
          return (
            <li key={w.id}>
              <div className="flex items-center gap-3 py-2.5">
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : w.id)} aria-expanded={isOpen}>
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className="tr-word text-[18px]" lang="tr">
                      {w.tr}
                    </span>
                    <span className="text-[15px] text-ink-soft">{w.en}</span>
                  </span>
                  <span className="text-[12px] text-muted">
                    {w.pos}, unit {w.unit}
                  </span>
                </button>
                <span
                  className={`pill shrink-0 ${s === "known" ? "bg-ok-tint text-ok-text" : s === "learning" ? "bg-brand-tint text-brand-text" : "bg-haze text-muted"}`}
                >
                  {s === "known" ? "known" : s === "learning" ? "learning" : "new"}
                </span>
                <Speak text={w.tr} size="sm" />
              </div>
              {isOpen ? (
                <div className="mb-3 flex animate-rise flex-wrap items-end justify-between gap-3 rounded-[10px] bg-haze p-3">
                  {w.exTr ? (
                    <p className="text-[15px]">
                      <span lang="tr" className="font-medium">
                        {w.exTr}
                      </span>
                      <span className="block text-ink-soft">{w.exEn}</span>
                    </p>
                  ) : (
                    <span />
                  )}
                  {s === "new" ? (
                    <button
                      className="btn-secondary"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await learnWordNowAction(w.id);
                          if (r.ok) setAdded((x) => new Set(x).add(w.id));
                        })
                      }
                    >
                      Learn it now
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {list.length > limit ? (
        <button className="btn-secondary mt-5" onClick={() => setLimit(limit + PAGE * 2)}>
          Show more ({list.length - limit} left)
        </button>
      ) : null}
    </div>
  );
}
