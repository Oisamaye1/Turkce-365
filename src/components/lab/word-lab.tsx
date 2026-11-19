"use client";

import { useMemo, useState } from "react";
import { englishVerbPhrase, pluralize } from "@/lib/grammar/english";
import { CASE_LABEL, PERSON_LABEL, POSS_LABEL, RULE_TEXT, TENSE_INFO, nounLabels, verbLabels } from "@/lib/lab/labels";
import { inflectNoun, type Case, type NounEntry, type Person } from "@/lib/turkish/nouns";
import { normalizeAnswer } from "@/lib/turkish/text";
import { QUESTION_TENSES, TENSES, conjugate, personsFor, type Tense, type VerbEntry } from "@/lib/turkish/verbs";
import { WordAnatomy } from "../anatomy";
import { IconArrow } from "../icons";
import { Speak } from "../speech";

export interface LabNoun extends NounEntry {
  en: string;
}
export interface LabVerb extends VerbEntry {
  en: string;
}

const PERSONS: Person[] = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"];
const CASES: Case[] = ["nom", "acc", "dat", "loc", "abl", "gen", "ins"];

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { v: T; label: string; hint?: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className={disabled ? "opacity-40" : ""} disabled={disabled}>
      <legend className="mb-2 text-[14px] text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5" role="radiogroup">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            disabled={o.disabled}
            title={o.hint}
            onClick={() => onChange(o.v)}
            className={`rounded-full border px-3 py-1.5 text-[14px] transition-[background-color,color,border-color,transform] duration-150 active:scale-95 disabled:opacity-35 ${
              value === o.v ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft hover:bg-haze"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Picker<T extends { en: string }>({
  items,
  label,
  value,
  onPick,
  text,
}: {
  items: T[];
  label: string;
  value: number;
  onPick: (i: number) => void;
  text: (x: T) => string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const n = normalizeAnswer(q);
    if (!n) return [];
    const scored = items
      .map((x, i) => ({ i, t: normalizeAnswer(text(x)), e: normalizeAnswer(x.en) }))
      .filter((x) => x.t.includes(n) || x.e.includes(n))
      .sort((a, b) => Number(!a.t.startsWith(n)) - Number(!b.t.startsWith(n)) || a.t.length - b.t.length);
    return scored.slice(0, 8);
  }, [q, items, text]);
  return (
    <div className="relative">
      <label className="mb-2 block text-[14px] text-muted" htmlFor="lab-search">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id="lab-search"
          className="input"
          placeholder={`${text(items[value])}, or search in Turkish or English`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={() => onPick(Math.floor(Math.random() * items.length))}>
          Random
        </button>
      </div>
      {open && matches.length ? (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 animate-fade overflow-auto rounded-[12px] border border-line bg-paper py-1 shadow-lg" role="listbox">
          {matches.map((m) => (
            <li key={m.i}>
              <button
                type="button"
                role="option"
                aria-selected={m.i === value}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-haze"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(m.i);
                  setQ("");
                  setOpen(false);
                }}
              >
                <span className="tr-word text-[17px]" lang="tr">
                  {text(items[m.i])}
                </span>
                <span className="truncate text-[13px] text-muted">{items[m.i].en}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function nounEnglish(n: LabNoun, plural: boolean, poss: Person | "none", c: Case): string {
  const g = n.en.split(/\s*[/;]\s*/)[0].replace(/\(.*?\)/g, "").trim();
  const noun = plural ? pluralize(g) : g;
  const np = poss === "none" ? (c === "nom" || c === "acc" || c === "gen" ? `the ${noun}` : `the ${noun}`) : `${POSS_LABEL[poss]} ${noun}`;
  switch (c) {
    case "nom":
      return poss === "none" ? (plural ? noun : `a / the ${noun}`) : np;
    case "acc":
      return `${np} (as the object)`;
    case "dat":
      return `to ${np}`;
    case "loc":
      return `in / at ${np}`;
    case "abl":
      return `from ${np}`;
    case "gen":
      return `${np}'s`;
    case "ins":
      return `with ${np}`;
  }
}

/** The result card: the word, its pieces with meanings, what changed and why. */
function Result({ form, parts, labels, english, rules, steps }: { form: string; parts: string[]; labels?: string[]; english: string; rules: string[]; steps?: { form: string; add: string }[] }) {
  const why = [...new Set(rules)].filter((r) => RULE_TEXT[r]);
  return (
    <div className="rounded-[16px] border border-line p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div key={form} className="min-w-0 animate-rise">
          <WordAnatomy parts={parts} labels={labels} size="xl" />
        </div>
        <Speak text={form} size="lg" />
      </div>
      <p className="mt-5 text-[19px] text-ink">{english}</p>
      {steps && steps.length > 1 ? (
        <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[15px]" aria-label="Built step by step">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 ? <IconArrow size={14} className="text-muted" /> : null}
              <span className="tr-word" lang="tr">
                {s.form}
              </span>
              {s.add ? <span className="text-[13px] text-muted">{s.add}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {why.length ? (
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-[14px] text-muted">What happened here</p>
          <ul className="mt-2 space-y-1.5">
            {why.map((r) => (
              <li key={r} className="flex gap-2 text-[15px] text-ink-soft">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {RULE_TEXT[r]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function WordLab({ nouns, verbs }: { nouns: LabNoun[]; verbs: LabVerb[] }) {
  const [mode, setMode] = useState<"noun" | "verb">("noun");
  const [ni, setNi] = useState(() => Math.max(0, nouns.findIndex((n) => n.word === "ev")));
  const [vi, setVi] = useState(() => Math.max(0, verbs.findIndex((v) => v.infinitive === "gelmek")));
  const [plural, setPlural] = useState(true);
  const [poss, setPoss] = useState<Person | "none">("1pl");
  const [kase, setKase] = useState<Case>("abl");
  const [tense, setTense] = useState<Tense>("present");
  const [person, setPerson] = useState<Person>("1sg");
  const [neg, setNeg] = useState(false);
  const [q, setQ] = useState(false);

  const noun = nouns[ni];
  const verb = verbs[vi];
  const persons = personsFor(tense);
  const p = persons.includes(person) ? person : persons[0];
  const canAsk = QUESTION_TENSES.includes(tense);

  const nounOut = useMemo(() => {
    const spec = { plural, possessive: poss === "none" ? undefined : poss, case: kase === "nom" ? undefined : kase };
    const r = inflectNoun(noun, spec);
    // Step-by-step: add one ending at a time.
    const steps: { form: string; add: string }[] = [{ form: noun.word, add: "" }];
    if (plural) steps.push({ form: inflectNoun(noun, { plural }).form, add: "plural" });
    if (spec.possessive) steps.push({ form: inflectNoun(noun, { plural, possessive: spec.possessive }).form, add: POSS_LABEL[spec.possessive] });
    if (spec.case) steps.push({ form: r.form, add: CASE_LABEL[spec.case as Exclude<Case, "nom">] });
    const gloss = noun.en.split(/\s*[/;]\s*/)[0].replace(/\(.*?\)/g, "").trim();
    return { ...r, labels: nounLabels(gloss, spec, r.parts), english: nounEnglish(noun, plural, poss, kase), steps };
  }, [noun, plural, poss, kase]);

  const verbOut = useMemo(() => {
    const opts = { negative: neg, question: canAsk && q };
    const r = conjugate(verb, tense, p, opts);
    const gloss = verb.en.split(/\s*[/;]\s*/)[0].replace(/\(.*?\)/g, "").replace(/^to\s+/, "").trim();
    return { ...r, form: r.form, labels: verbLabels(gloss, tense, p, opts, r.parts), english: englishVerbPhrase(verb.en, tense, p, opts) };
  }, [verb, tense, p, neg, q, canAsk]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="space-y-6">
        <div className="inline-flex rounded-[12px] border border-line p-1" role="tablist" aria-label="What to build">
          {(["noun", "verb"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`h-10 rounded-[9px] px-5 text-[15px] transition-colors ${mode === m ? "bg-ink text-paper" : "text-ink-soft hover:bg-haze"}`}
            >
              {m === "noun" ? "Nouns" : "Verbs"}
            </button>
          ))}
        </div>

        {mode === "noun" ? (
          <>
            <Picker items={nouns} label="Word" value={ni} onPick={setNi} text={(n) => n.word} />
            <Seg
              label="How many"
              value={plural ? "many" : "one"}
              options={[
                { v: "one", label: "one" },
                { v: "many", label: "many (-lar/-ler)" },
              ]}
              onChange={(v) => setPlural(v === "many")}
            />
            <Seg
              label="Whose"
              value={poss}
              options={[{ v: "none" as const, label: "nobody's" }, ...PERSONS.map((x) => ({ v: x, label: POSS_LABEL[x] }))]}
              onChange={setPoss}
            />
            <Seg
              label="Role in the sentence"
              value={kase}
              options={CASES.map((c) => ({ v: c, label: c === "nom" ? "subject" : CASE_LABEL[c] }))}
              onChange={setKase}
            />
          </>
        ) : (
          <>
            <Picker items={verbs} label="Verb" value={vi} onPick={setVi} text={(v) => v.infinitive} />
            <Seg label="Tense or mood" value={tense} options={TENSES.map((t) => ({ v: t, label: TENSE_INFO[t].label, hint: TENSE_INFO[t].en }))} onChange={setTense} />
            <Seg
              label="Who"
              value={p}
              options={PERSONS.map((x) => ({ v: x, label: tense === "imperative" ? (x === "2sg" ? "you (friend)" : x === "2pl" ? "you (polite)" : PERSON_LABEL[x]) : PERSON_LABEL[x], disabled: !persons.includes(x) }))}
              onChange={setPerson}
            />
            <div className="flex flex-wrap gap-6">
              <Seg label="Positive or negative" value={neg ? "neg" : "pos"} options={[{ v: "pos", label: "positive" }, { v: "neg", label: "negative" }]} onChange={(v) => setNeg(v === "neg")} />
              <Seg
                label="Statement or question"
                value={canAsk && q ? "q" : "s"}
                options={[
                  { v: "s", label: "statement" },
                  { v: "q", label: "question", disabled: !canAsk },
                ]}
                onChange={(v) => setQ(v === "q")}
              />
            </div>
          </>
        )}
      </section>

      <section className="lg:sticky lg:top-12 lg:self-start" aria-live="polite">
        {mode === "noun" ? (
          <Result form={nounOut.form} parts={nounOut.parts} labels={nounOut.labels} english={nounOut.english} rules={nounOut.rules} steps={nounOut.steps} />
        ) : (
          <Result form={verbOut.form} parts={verbOut.parts} labels={verbOut.labels} english={verbOut.english} rules={verbOut.rules} />
        )}
        <p className="mt-3 text-[13px] text-muted">
          Built by the same engine that checks your drills. Every Turkish word follows these rules, so once you see the pattern you can build words you&apos;ve never met.
        </p>
      </section>
    </div>
  );
}
