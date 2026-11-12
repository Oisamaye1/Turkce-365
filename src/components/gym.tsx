"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDrillsAction } from "@/app/actions";
import type { StepStatus } from "@/lib/db/grammar";
import type { Drill } from "@/lib/grammar/drills";
import type { GrammarStep } from "@/lib/grammar/steps";
import { DrillCard } from "./drill-runner";
import { IconCheck, IconLock } from "./icons";
import { Simit } from "./simit";
import { Speak } from "./speech";
import { ProgressBar, SpeechBubble } from "./ui";

/** Small progress ring for a grammar step. */
function Ring({ value, locked, mastered, n, active }: { value: number; locked: boolean; mastered: boolean; n: number; active: boolean }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--locked)" strokeWidth="5" />
        {!locked ? (
          <circle cx="22" cy="22" r={r} fill="none" stroke={mastered ? "var(--zeytin)" : "var(--kobalt)"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />
        ) : null}
      </svg>
      <span
        className={`font-display relative grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${
          locked ? "text-muted" : mastered ? "bg-zeytin text-white" : active ? "bg-kobalt text-white" : "text-ink"
        }`}
      >
        {locked ? <IconLock size={16} /> : mastered ? <IconCheck size={16} /> : n}
      </span>
    </span>
  );
}

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
  // New step → show the rule; once you've practised it a few times it starts collapsed.
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
  }, [stepId]);

  const drill = drills[idx];
  const m = mastery[stepId] ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="order-2 lg:order-1">
        <h2 className="font-display mb-1 text-xl font-extrabold">16 grammar steps</h2>
        <p className="mb-3 text-sm text-muted">Each unlocks at 90% over your last 20 drills.</p>
        <ol className="space-y-1">
          {steps.map((s) => {
            const st = statuses.find((x) => x.stepId === s.id);
            const locked = !st?.unlocked;
            const v = mastery[s.id] ?? 0;
            const mastered = !!st?.mastered || v >= 0.9;
            return (
              <li key={s.id}>
                <button
                  disabled={locked}
                  onClick={() => {
                    setStepId(s.id);
                    router.replace(`/gym?step=${s.id}`, { scroll: false });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-2 py-1.5 text-left ${
                    s.id === stepId ? "border-kobalt/40 bg-kobalt-tint" : locked ? "border-transparent opacity-55" : "border-transparent hover:bg-wash"
                  }`}
                >
                  <Ring value={v} locked={locked} mastered={mastered} n={s.id} active={s.id === stepId} />
                  <span className="min-w-0">
                    <span className="font-display block truncate font-bold">{s.title}</span>
                    <span className="block truncate text-xs text-muted" lang="tr">
                      {s.titleTr}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="order-1 min-w-0 space-y-6 lg:order-2">
        <div className="rounded-3xl bg-banner p-5 text-white shadow-[0_5px_0_var(--banner-depth)]">
          <p className="font-display font-bold text-white/75">Step {step.id} of 16</p>
          <h2 className="font-display text-3xl leading-tight font-extrabold">{step.title}</h2>
          <p className="text-white/80" lang="tr">
            {step.titleTr}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={Math.round(m * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-cay transition-[width] duration-500" style={{ width: `${Math.round(m * 100)}%` }} />
            </div>
            <span className="font-display font-extrabold">{Math.round(m * 100)}%</span>
          </div>
          <p className="mt-1 text-sm text-white/75">
            {status?.mastered || m >= 0.9 ? "Mastered — keep it fresh with a few drills now and then." : "Score 90% over your last 20 drills to unlock the next step."}
            {session.n ? ` This session: ${session.correct} of ${session.n}.` : ""}
          </p>
        </div>

        <div>
          <button className="btn-quiet !px-0" onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide}>
            {showGuide ? "Hide the rule" : "Show the rule"}
          </button>
          {showGuide ? (
            <div className="mt-2 space-y-4">
              <p className="max-w-[65ch] text-lg leading-relaxed">{step.explanation}</p>
              <div className="grid grid-cols-2 gap-3">
                {step.examples.map((e) => (
                  <div key={e.tr} className="flex items-start gap-3 rounded-3xl border-2 border-line p-3.5">
                    <Speak text={e.tr} size="sm" />
                    <div>
                      <p className="tr-word text-xl leading-tight" lang="tr">
                        {e.tr}
                      </p>
                      <p className="text-sm text-ink-soft">{e.en}</p>
                      {e.breakdown ? <p className="font-display mt-0.5 text-sm font-bold text-turkuaz-depth">{e.breakdown}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {unlocked ? (
          <div className="flex items-center gap-3">
            <Simit size={90} mood="proud" className="shrink-0" />
            <SpeechBubble className="flex-1">
              <p className="font-display text-xl font-extrabold text-zeytin-depth">Step {unlocked} unlocked!</p>
              <p className="text-ink-soft">{steps.find((s) => s.id === unlocked)?.title}</p>
              <button
                className="btn-success mt-3"
                onClick={() => {
                  router.refresh();
                  setStepId(unlocked);
                }}
              >
                Start step {unlocked}
              </button>
            </SpeechBubble>
          </div>
        ) : null}

        <div className="rounded-3xl border-2 border-line p-4 sm:p-6">
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
        <ProgressBar value={idx} max={Math.max(1, drills.length)} thin tone="turkuaz" />
      </section>
    </div>
  );
}
