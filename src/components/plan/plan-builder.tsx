"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createPlanAction } from "@/app/actions";
import { IconArrow, IconCheck } from "../icons";

export interface BuilderStage {
  id: number;
  title: string;
  titleTr: string;
  level: string;
  outcome: string;
  firstDay: number;
  lastDay: number;
}

export interface BuilderStart {
  id: "zero" | "basics" | "survival" | "a2";
  title: string;
  detail: string;
  day: number;
}

const DAYS_OPTIONS = [3, 4, 5, 6, 7];

function addDaysIso(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
const fmtMonth = (d: Date) => d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const fmtShort = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Two questions, a live preview of the year, then one short build moment. */
export function PlanBuilder({
  stages,
  starts,
  today,
  totalDays,
  rebuilding = false,
}: {
  stages: BuilderStage[];
  starts: BuilderStart[];
  today: string;
  totalDays: number;
  rebuilding?: boolean;
}) {
  const router = useRouter();
  const [start, setStart] = useState<BuilderStart["id"]>("zero");
  const [dpw, setDpw] = useState(6);
  const [building, setBuilding] = useState(false);
  const [pending, run] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const startDay = starts.find((s) => s.id === start)!.day;
  const daysLeft = totalDays - startDay + 1;
  // Calendar days to cover `n` plan days at `dpw` study days a week.
  const span = (n: number) => Math.ceil((n / dpw) * 7);
  const finish = addDaysIso(today, span(daysLeft));
  const timeline = useMemo(
    () =>
      stages.map((s) => ({
        ...s,
        skipped: s.lastDay < startDay,
        from: addDaysIso(today, span(Math.max(0, s.firstDay - startDay))),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stages, startDay, dpw, today],
  );

  const create = () => {
    setError(null);
    setBuilding(true);
    run(async () => {
      const [r] = await Promise.all([createPlanAction({ start, daysPerWeek: dpw }), new Promise((ok) => setTimeout(ok, 1400))]);
      if (!r.ok) {
        setBuilding(false);
        setError(r.error ?? "Couldn't create the plan.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div>
        <h1 className="display-xl text-[48px] sm:text-[72px]" lang="tr">
          Sıfırdan konuşmaya.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[17px] text-ink-soft">
          {rebuilding
            ? "Build your plan again. Your words, reviews and suffix progress stay as they are; only the day-by-day plan starts over."
            : "A day-by-day plan from where you are to real conversations: about 25 minutes a day, in six stages. Answer two questions."}
        </p>

        <fieldset className="mt-10">
          <legend className="font-display text-[21px] font-semibold">Where are you starting?</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup">
            {starts.map((s) => {
              const on = s.id === start;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setStart(s.id)}
                  className={`relative rounded-[14px] border p-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.99] ${
                    on ? "border-brand bg-brand-tint" : "border-line hover:border-line-strong hover:bg-haze"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{s.title}</span>
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full border transition-colors ${on ? "border-brand bg-brand text-white" : "border-line-strong"}`}
                      aria-hidden="true"
                    >
                      {on ? <IconCheck size={12} className="animate-pop" /> : null}
                    </span>
                  </span>
                  <span className="mt-1 block text-[15px] text-ink-soft">{s.detail}</span>
                  <span className="mt-2 block text-[13px] text-muted">Starts at day {s.day}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-10">
          <legend className="font-display text-[21px] font-semibold">How many days a week can you study?</legend>
          <div className="mt-4 inline-flex rounded-[12px] border border-line p-1" role="radiogroup">
            {DAYS_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={dpw === n}
                onClick={() => setDpw(n)}
                className={`h-10 w-12 rounded-[9px] text-[16px] tabular transition-colors duration-150 ${dpw === n ? "bg-ink text-paper" : "text-ink-soft hover:bg-haze"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-3 max-w-[52ch] text-[15px] text-muted">
            The plan never runs ahead of you. Miss a day and it simply waits; the next day opens when you finish the last one.
          </p>
        </fieldset>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button className="btn-primary h-12 px-6 text-[16px]" onClick={create} disabled={pending || building}>
            {building ? "Building your plan…" : rebuilding ? "Rebuild my plan" : "Create my plan"}
            {!building ? <IconArrow size={17} /> : null}
          </button>
          {error ? (
            <p className="text-bad-text" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {/* Live preview of the year */}
      <aside className="self-start rounded-[16px] border border-line p-6 lg:sticky lg:top-12" aria-live="polite">
        <p className="text-[14px] text-muted">Your year</p>
        <p className="font-display mt-1 text-[28px] leading-tight font-semibold">
          {daysLeft} days, finishing around <span className="text-accent-text">{fmtMonth(finish)}</span>
        </p>
        <p className="mt-1 text-[15px] text-ink-soft tabular">
          {dpw} days a week, about 25 minutes each
        </p>
        <ol className="mt-6">
          {timeline.map((s, i) => {
            const lit = building && !s.skipped;
            return (
              <li key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
                {i < timeline.length - 1 ? <span className="absolute top-6 bottom-0 left-[11px] w-px bg-line-strong" aria-hidden="true" /> : null}
                <span
                  className={`relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[12px] tabular transition-colors duration-300 ${
                    s.skipped ? "border-line bg-haze text-muted" : lit ? "animate-pop border-ok bg-ok text-white" : "border-line-strong bg-paper text-ink-soft"
                  }`}
                  style={lit ? { animationDelay: `${i * 180}ms` } : undefined}
                >
                  {lit || s.skipped ? <IconCheck size={13} /> : s.id}
                </span>
                <div className={`min-w-0 ${s.skipped ? "opacity-50" : ""}`}>
                  <p className="font-medium text-ink">
                    {s.title} <span className="text-[13px] font-normal text-muted">{s.level}</span>
                  </p>
                  <p className="text-[14px] text-ink-soft">{s.outcome}</p>
                  <p className="mt-0.5 text-[13px] text-muted tabular">{s.skipped ? "Already know it" : `From ${fmtShort(s.from)}`}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
