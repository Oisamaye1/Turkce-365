"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDrillsAction } from "@/app/actions";
import type { StepStatus } from "@/lib/db/grammar";
import type { Drill } from "@/lib/grammar/drills";
import type { GrammarStep } from "@/lib/grammar/steps";
import { WordAnatomy, parseBreakdown } from "./anatomy";
import { DrillCard } from "./drill-runner";
import { IconCheck, IconLock } from "./icons";
import { Speak } from "./speech";
import { ProgressBar } from "./ui";

export function Gym({ steps, statuses, initialStep }: { steps: GrammarStep[]; statuses: StepStatus[]; initialStep: number }) {
  const router = useRouter();
  const [stepId, setStepId] = useState(initialStep);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mastery, setMastery] = useState<Record<number, number>>(Object.fromEntries(statuses.map((s) => [s.stepId, s.mastery])));
  const [session, setSession] = useState({ n: 0, correct: 0 });
  const [unlocked, setUnlocked] = useState<number | null>(null);

  const step = steps.find((s) => s.id === stepId)!;
  const status = statuses.find((s) => s.stepId === stepId);
  // A new step shows its rule; once practised a few times the rule starts collapsed.
  const [showGuide, setShowGuide] = useState((status?.attempts ?? 0) < 5);

  const load = async (id: number) => {
    setLoading(true);
    setDrills(await getDrillsAction(id, 10));
    setIdx(0);
    setLoading(false);
  };

  useEffect(() => {
    load(stepId);
    setShowGuide((statuses.find((s) => s.stepId === stepId)?.attempts ?? 0) < 5);
    setSession({ n: 0, correct: 0 });
    setUnlocked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  const drill = drills[idx];
  const m = mastery[stepId] ?? 0;
  const mastered = !!status?.mastered || m >= 0.9;

  return (
    <div className="grid gap-12 lg:grid-cols-[250px_minmax(0,1fr)]">
      <nav className="order-2 lg:order-1" aria-label="Grammar steps">
        <p className="mb-3 text-[14px] text-muted">Each step unlocks the next at 90% over your last 20 drills.</p>
        <ol className="border-t border-line">
          {steps.map((s) => {
            const st = statuses.find((x) => x.stepId === s.id);
            const locked = !st?.unlocked;
            const v = mastery[s.id] ?? 0;
            const done = !!st?.mastered || v >= 0.9;
            const on = s.id === stepId;
            return (
              <li key={s.id}>
                <button
                  disabled={locked}
                  onClick={() => {
                    setStepId(s.id);
                    router.replace(`/gym?step=${s.id}`, { scroll: false });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  aria-current={on ? "step" : undefined}
                  className={`relative flex w-full items-center gap-3 border-b border-line py-2.5 pl-3 text-left ${locked ? "text-muted" : "hover:bg-haze"} ${on ? "bg-haze" : ""}`}
                >
                  {on ? <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" aria-hidden="true" /> : null}
                  <span className="w-5 shrink-0 text-[13px] text-muted tabular">{s.id}</span>
                  <span className={`min-w-0 flex-1 truncate text-[15px] ${on ? "font-medium text-ink" : ""}`}>{s.title}</span>
                  <span className="shrink-0 pr-3 text-[13px] tabular">
                    {locked ? <IconLock size={14} /> : done ? <IconCheck size={15} className="text-ok-text" /> : v ? <span className="text-muted">{Math.round(v * 100)}%</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="order-1 min-w-0 lg:order-2">
        <p className="text-[15px] text-muted">Step {step.id} of 16</p>
        <h2 className="font-display mt-1 text-[33px] leading-tight font-semibold sm:text-[42px]">{step.title}</h2>
        <p className="text-ink-soft" lang="tr">
          {step.titleTr}
        </p>
        <div className="mt-5 flex max-w-md items-center gap-3">
          <ProgressBar value={m} tone={mastered ? "ok" : "accent"} />
          <span className="shrink-0 text-[14px] text-muted tabular">{Math.round(m * 100)}%</span>
        </div>
        <p className="mt-1.5 text-[14px] text-muted tabular">
          {mastered ? "Mastered. A few drills now and then keep it fresh." : "Reach 90% over your last 20 drills to unlock the next step."}
          {session.n ? ` This session: ${session.correct} of ${session.n}.` : ""}
        </p>

        <div className="mt-8 border-t border-line pt-5">
          <button className="btn-quiet -ml-2" onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide}>
            {showGuide ? "Hide the rule" : "Show the rule"}
          </button>
          {showGuide ? (
            <div className="mt-3">
              <p className="max-w-[62ch] text-[17px] leading-relaxed">{step.explanation}</p>
              <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {step.examples.map((e) => (
                  <li key={e.tr} className="flex items-start justify-between gap-3">
                    <div>
                      {e.breakdown ? <WordAnatomy parts={parseBreakdown(e.breakdown)} size="md" /> : <span className="tr-word text-[21px]">{e.tr}</span>}
                      <p className="mt-2 text-[14px] text-ink-soft">{e.en}</p>
                    </div>
                    <Speak text={e.tr} size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {unlocked ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-ok-tint p-5" role="status">
            <div>
              <p className="font-display text-[21px] font-semibold text-ok-text">Step {unlocked} unlocked</p>
              <p className="text-ink-soft">{steps.find((s) => s.id === unlocked)?.title}</p>
            </div>
            <button
              className="btn-ok"
              onClick={() => {
                router.refresh();
                setStepId(unlocked);
              }}
            >
              Start step {unlocked}
            </button>
          </div>
        ) : null}

        <div className="mt-10 rounded-[14px] border border-line p-5 sm:p-7">
          {loading || !drill ? (
            <p className="text-muted">Loading drills…</p>
          ) : (
            <DrillCard
              key={drill.id + idx}
              drill={drill}
              context="gym"
              sheet="inline"
              onRecorded={(r) => {
                setMastery((x) => ({ ...x, [stepId]: r.mastery }));
                if (r.unlocked) setUnlocked(r.unlocked);
              }}
              onDone={(o) => {
                setSession((s) => ({ n: s.n + 1, correct: s.correct + (o.result === "correct" ? 1 : 0) }));
                if (idx + 1 >= drills.length) load(stepId);
                else setIdx(idx + 1);
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
