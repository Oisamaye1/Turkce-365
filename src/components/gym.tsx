"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDrillsAction } from "@/app/actions";
import type { StepStatus } from "@/lib/db/grammar";
import type { Drill } from "@/lib/grammar/drills";
import type { GrammarStep } from "@/lib/grammar/steps";
import { DrillCard } from "./drill-runner";
import { Speak } from "./speech";
import { Badge, ProgressBar } from "./ui";

export function Gym({ steps, statuses, initialStep }: { steps: GrammarStep[]; statuses: StepStatus[]; initialStep: number }) {
  const router = useRouter();
  const [stepId, setStepId] = useState(initialStep);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mastery, setMastery] = useState<Record<number, number>>(Object.fromEntries(statuses.map((s) => [s.stepId, s.mastery])));
  const [session, setSession] = useState({ n: 0, correct: 0 });
  const [unlocked, setUnlocked] = useState<number | null>(null);
  const [showRule, setShowRule] = useState(true);

  const step = steps.find((s) => s.id === stepId)!;
  const status = statuses.find((s) => s.stepId === stepId);

  const load = async (id: number) => {
    setLoading(true);
    const d = await getDrillsAction(id, 10);
    setDrills(d);
    setIdx(0);
    setLoading(false);
  };

  useEffect(() => {
    load(stepId);
    setSession({ n: 0, correct: 0 });
    setUnlocked(null);
  }, [stepId]);

  const drill = drills[idx];

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="card h-fit !p-2">
        <div className="px-2 pt-1 pb-2 text-xs text-muted">Unlock the next step at 90 % over 20 drills.</div>
        <ol className="max-h-[50vh] space-y-0.5 overflow-y-auto lg:max-h-none">
          {steps.map((s) => {
            const st = statuses.find((x) => x.stepId === s.id);
            const locked = !st?.unlocked;
            const m = mastery[s.id] ?? 0;
            return (
              <li key={s.id}>
                <button
                  disabled={locked}
                  onClick={() => {
                    setStepId(s.id);
                    router.replace(`/gym?step=${s.id}`, { scroll: false });
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    s.id === stepId ? "bg-fg text-bg" : locked ? "opacity-45" : "hover:bg-card-2"
                  }`}
                >
                  <span className="w-5 text-right font-mono text-xs">{s.id}</span>
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <span className="text-xs">{locked ? "🔒" : st?.mastered || m >= 0.9 ? "✓" : `${Math.round(m * 100)}%`}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-xs text-muted">Step {step.id} / 16</div>
              <h2 className="text-xl font-bold">
                {step.title} <span className="label-tr">· {step.titleTr}</span>
              </h2>
            </div>
            <button className="btn-ghost !py-1.5 text-xs" onClick={() => setShowRule((v) => !v)}>
              {showRule ? "Hide rule" : "Show rule"}
            </button>
          </div>
          {showRule ? (
            <>
              <p className="text-sm leading-relaxed">{step.explanation}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {step.examples.map((e) => (
                  <div key={e.tr} className="flex items-center justify-between gap-2 rounded-xl bg-card-2 px-3 py-2 text-sm">
                    <div>
                      <div className="font-semibold">{e.tr}</div>
                      <div className="text-xs text-muted">
                        {e.en}
                        {e.breakdown ? ` · ${e.breakdown}` : ""}
                      </div>
                    </div>
                    <Speak text={e.tr} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Last 20 drills · Son 20</span>
              <span>
                {Math.round((mastery[stepId] ?? 0) * 100)}% {status?.mastered ? "· mastered" : "/ 90% to unlock"}
              </span>
            </div>
            <ProgressBar value={mastery[stepId] ?? 0} />
          </div>
          {session.n ? (
            <p className="text-xs text-muted">
              This session: {session.correct}/{session.n} correct
            </p>
          ) : null}
        </div>

        {unlocked ? (
          <div className="card border-good bg-good-soft">
            <div className="font-bold text-good">🎉 Step {unlocked} unlocked! · Yeni adım açıldı!</div>
            <p className="text-sm">{steps.find((s) => s.id === unlocked)?.title}</p>
            <button
              className="btn-primary mt-2"
              onClick={() => {
                router.refresh();
                setStepId(unlocked);
              }}
            >
              Go to step {unlocked} →
            </button>
          </div>
        ) : null}

        {loading || !drill ? (
          <div className="card text-muted">Loading drills…</div>
        ) : (
          <DrillCard
            key={drill.id + idx}
            drill={drill}
            context="gym"
            onRecorded={(r) => {
              setMastery((m) => ({ ...m, [stepId]: r.mastery }));
              if (r.unlocked) setUnlocked(r.unlocked);
            }}
            onDone={(o) => {
              setSession((s) => ({ n: s.n + 1, correct: s.correct + (o.result === "correct" ? 1 : 0) }));
              if (idx + 1 >= drills.length) load(stepId);
              else setIdx(idx + 1);
            }}
          />
        )}
        <p className="text-center text-xs text-muted">
          <Badge>Tip</Badge> Missing Turkish letters count as “almost”. Typos are not forgiven here — the suffix is the point.
        </p>
      </section>
    </div>
  );
}
