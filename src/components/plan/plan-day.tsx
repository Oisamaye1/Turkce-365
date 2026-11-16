"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { finishPlanDayAction, planTickAction } from "@/app/actions";
import type { PlanDay, PlanTask, TaskKind } from "@/lib/plan/build";
import type { TaskState } from "@/lib/plan/status";
import { WordAnatomy, parseBreakdown } from "../anatomy";
import { IconArrow, IconCheck, IconTarget } from "../icons";
import { Speak } from "../speech";
import { ProgressBar } from "../ui";
import { Celebration } from "./celebration";

export interface PlanDayProps {
  day: PlanDay;
  tasks: TaskState[];
  isCurrent: boolean;
  completed: boolean;
  canFinish: boolean;
  words: { tr: string; en: string }[];
  next?: { day: number; title: string; weekTitle: string } | null;
  finishedToday?: number;
}

const START_LABEL: Partial<Record<TaskKind, string>> = {
  reviews: "Start reviews",
  lesson: "Open lesson",
  drills: "Start drills",
  write: "Start writing",
  mission: "Open mission",
};

const SELF = [
  { v: "yes", label: "Yes, I can" },
  { v: "mostly", label: "Mostly" },
  { v: "notyet", label: "Not yet" },
];

export function PlanDayChecklist(props: PlanDayProps) {
  const { day, isCurrent, completed, words, next } = props;
  const router = useRouter();
  const [tasks, setTasks] = useState(props.tasks);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();
  // Snapshot of the finished day: the page refreshes underneath with the next day.
  const [celebrate, setCelebrate] = useState<{
    finishedToday: number;
    day: number;
    weekDone: boolean;
    weekTitle: string;
    next: PlanDayProps["next"];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Server state wins whenever it changes (after refresh).
  useEffect(() => setTasks(props.tasks), [props.tasks]);

  const byKey = Object.fromEntries(tasks.map((t) => [t.key, t])) as Record<TaskKind, TaskState>;
  const required = day.tasks.filter((t) => !t.optional);
  const doneCount = required.filter((t) => byKey[t.key]?.done).length;
  const canFinish = isCurrent && !completed && doneCount === required.length;
  const firstOpen = day.tasks.find((t) => !byKey[t.key]?.done && !t.optional)?.key;
  const editable = isCurrent && !completed;

  const tick = (key: TaskKind, value: string | null) => {
    setTasks((ts) => ts.map((t) => (t.key === key ? { ...t, done: value !== null, how: value !== null ? "manual" : null, value: value ?? undefined } : t)));
    start(async () => {
      await planTickAction(day.day, key, value);
      router.refresh();
    });
  };

  const finish = () => {
    setError(null);
    const snap = { day: day.day, weekDone: day.index === 6, weekTitle: day.weekInfo.title, next: next ?? null };
    start(async () => {
      const r = await finishPlanDayAction(snap.day);
      if (!r.ok) {
        setError(r.error ?? "Couldn't finish the day.");
        return;
      }
      setCelebrate({ ...snap, finishedToday: r.finishedToday ?? 1 });
    });
  };

  return (
    <div>
      <ol className="stagger">
        {day.tasks.map((t, i) => {
          const st = byKey[t.key];
          const done = !!st?.done;
          const isNext = editable && t.key === firstOpen;
          const last = i === day.tasks.length - 1;
          return (
            <li key={t.key} className="relative flex gap-4" style={{ "--i": i } as React.CSSProperties}>
              <div className="relative flex w-8 shrink-0 justify-center pt-4">
                {!last ? <span className="absolute top-12 bottom-[-16px] w-px bg-line-strong" aria-hidden="true" /> : null}
                <Marker index={i} done={done} next={isNext} challenge={t.key === "challenge"} />
              </div>
              <div className={`min-w-0 flex-1 py-4 ${last ? "" : "border-b border-line"}`}>
                <TaskBody
                  task={t}
                  state={st}
                  day={day}
                  words={words}
                  primary={isNext}
                  editable={editable}
                  open={open[t.key] ?? (t.key === "learn" && !done)}
                  onToggle={() => setOpen((o) => ({ ...o, [t.key]: !(o[t.key] ?? (t.key === "learn" && !done)) }))}
                  onTick={tick}
                  busy={pending}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 rounded-[14px] border border-line p-5">
        <div className="flex items-center gap-3">
          <ProgressBar value={completed ? required.length : doneCount} max={required.length} tone={completed || canFinish ? "ok" : "accent"} />
          <span className="shrink-0 text-[14px] text-muted tabular">
            {completed ? "Done" : `${doneCount} of ${required.length}`}
          </span>
        </div>
        {completed ? (
          <p className="mt-3 flex items-center gap-2 text-ok-text">
            <IconCheck size={18} /> You finished day {day.day}.
          </p>
        ) : isCurrent ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-ink-soft">
              {canFinish ? "Everything's done. Close the day to unlock the next one." : "Tasks tick themselves off as you do them. Optional ones don't count."}
            </p>
            <button className={canFinish ? "btn-ok" : "btn-secondary"} disabled={!canFinish || pending} onClick={finish}>
              {pending && canFinish ? "Saving…" : `Finish day ${day.day}`}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-[15px] text-ink-soft">This is a preview. You'll get here after the days before it.</p>
        )}
        {error ? (
          <p className="mt-3 text-[15px] text-bad-text" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {celebrate ? (
        <Celebration
          day={celebrate.day}
          weekDone={celebrate.weekDone}
          weekTitle={celebrate.weekTitle}
          next={celebrate.next ?? null}
          finishedToday={celebrate.finishedToday}
          onClose={() => {
            setCelebrate(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Marker({ index, done, next, challenge }: { index: number; done: boolean; next: boolean; challenge: boolean }) {
  if (done)
    return (
      <span className="grid h-8 w-8 animate-pop place-items-center rounded-full bg-ok text-white">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="check-draw" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    );
  if (challenge)
    return (
      <span className={`grid h-8 w-8 place-items-center rounded-full ${next ? "animate-here bg-accent text-white" : "bg-accent-tint text-accent-text"}`}>
        <IconTarget size={17} />
      </span>
    );
  if (next) return <span className="grid h-8 w-8 animate-here place-items-center rounded-full bg-accent text-[14px] font-semibold text-white tabular">{index + 1}</span>;
  return <span className="grid h-8 w-8 place-items-center rounded-full border border-line-strong bg-paper text-[14px] text-ink-soft tabular">{index + 1}</span>;
}

function TaskBody({
  task,
  state,
  day,
  words,
  primary,
  editable,
  open,
  onToggle,
  onTick,
  busy,
}: {
  task: PlanTask;
  state?: TaskState;
  day: PlanDay;
  words: { tr: string; en: string }[];
  primary: boolean;
  editable: boolean;
  open: boolean;
  onToggle: () => void;
  onTick: (key: TaskKind, value: string | null) => void;
  busy: boolean;
}) {
  const done = !!state?.done;
  const head = (
    <div className="flex items-baseline justify-between gap-3">
      <p className={`font-display text-[19px] leading-snug font-semibold ${done ? "text-ink-soft" : "text-ink"}`}>
        {task.title}
        {task.optional ? <span className="ml-2 font-sans text-[13px] font-normal text-muted">optional</span> : null}
      </p>
      <span className="shrink-0 text-[13px] text-muted tabular">{done ? (state?.how === "auto" ? "Done" : doneLabel(task.key, state?.value)) : `${task.minutes} min`}</span>
    </div>
  );

  // ── Learn card: the day's idea, inline
  if (task.key === "learn" && day.concept) {
    const c = day.concept;
    return (
      <div>
        <button type="button" className="w-full text-left" onClick={onToggle} aria-expanded={open}>
          {head}
          <p className="mt-0.5 text-[14px] text-muted">
            <span lang="tr">{c.titleTr}</span>, {open ? "tap to fold" : "tap to read"}
          </p>
        </button>
        {open ? (
          <div className="mt-4 animate-rise rounded-[12px] bg-haze p-5">
            <p className="max-w-[62ch] text-[17px] leading-relaxed text-ink">{c.body}</p>
            <ul className="mt-5 space-y-3">
              {c.examples.map((e) => (
                <li key={e.tr} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {e.breakdown ? (
                      <WordAnatomy parts={parseBreakdown(e.breakdown)} size="sm" />
                    ) : (
                      <p className="tr-word text-[19px]" lang="tr">
                        {e.tr}
                      </p>
                    )}
                    <p className="text-[14px] text-ink-soft">{e.en}</p>
                  </div>
                  <Speak text={e.tr.split("→").pop()!.trim()} size="sm" />
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {editable && !done ? (
                <button className="btn-primary" onClick={() => onTick("learn", "done")} disabled={busy}>
                  Got it
                </button>
              ) : null}
              {c.link ? (
                <Link href={c.link.href} className="btn-quiet">
                  {c.link.label} <IconArrow size={16} />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        {done && state?.how === "manual" && editable ? <UndoLink onClick={() => onTick("learn", null)} /> : null}
      </div>
    );
  }

  // ── Tiny challenge
  if (task.key === "challenge") {
    return (
      <div>
        {head}
        <div className={`mt-3 rounded-[12px] border-l-2 p-4 ${done ? "border-line-strong bg-haze" : "border-accent bg-accent-tint/60"}`}>
          <p className={`text-[17px] leading-relaxed ${done ? "text-ink-soft" : "text-ink"}`}>{day.challenge}</p>
        </div>
        {editable ? (
          done ? (
            <UndoLink onClick={() => onTick("challenge", null)} label={state?.value === "skipped" ? "Skipped. Try it after all" : "Undo"} />
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={primary ? "btn-primary" : "btn-secondary"} onClick={() => onTick("challenge", "done")} disabled={busy}>
                I did it
              </button>
              <button className="btn-quiet" onClick={() => onTick("challenge", "skipped")} disabled={busy}>
                Skip today
              </button>
            </div>
          )
        ) : null}
      </div>
    );
  }

  // ── Self-check
  if (task.key === "selfcheck") {
    return (
      <div>
        {head}
        <p className="mt-1 text-[15px] text-ink-soft">{task.detail ?? day.weekInfo.goal}</p>
        {editable ? (
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="How well can you do it?">
            {SELF.map((o) => {
              const on = state?.value === o.v;
              return (
                <button
                  key={o.v}
                  role="radio"
                  aria-checked={on}
                  onClick={() => onTick("selfcheck", on ? null : o.v)}
                  disabled={busy}
                  className={`rounded-full border px-3.5 py-1.5 text-[15px] transition-colors ${on ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-soft hover:bg-haze"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : null}
        {state?.value === "notyet" ? <p className="mt-2 text-[14px] text-muted">That's fine. This week's ideas come back in later lessons and reviews.</p> : null}
      </div>
    );
  }

  // ── Linked tasks (reviews, lesson, drills, write, mission)
  return (
    <div>
      {head}
      {task.detail ? <p className="mt-0.5 text-[14px] text-muted">{task.detail}</p> : null}
      {task.key === "reviews" && words.length ? (
        <p className="mt-2 flex flex-wrap gap-1.5" lang="tr">
          {words.slice(0, 8).map((w) => (
            <span key={w.tr} className="pill bg-brand-tint text-brand-text" title={w.en}>
              {w.tr}
            </span>
          ))}
          {words.length > 8 ? <span className="pill text-muted">+{words.length - 8}</span> : null}
        </p>
      ) : null}
      {editable && !done ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {task.href ? (
            <Link href={task.href} className={primary ? "btn-primary" : "btn-secondary"}>
              {task.manual ? "Open" : (START_LABEL[task.key] ?? "Open")} <IconArrow size={16} />
            </Link>
          ) : null}
          {state?.progress ? <span className="text-[14px] text-muted tabular">{state.progress}</span> : null}
          <button className="text-[14px] text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => onTick(task.key, "done")} disabled={busy}>
            Mark as done
          </button>
        </div>
      ) : null}
      {editable && done && state?.how === "manual" ? <UndoLink onClick={() => onTick(task.key, null)} /> : null}
    </div>
  );
}

function doneLabel(key: TaskKind, value?: string) {
  if (key === "challenge" && value === "skipped") return "Skipped";
  if (key === "selfcheck") return value === "yes" ? "Yes" : value === "mostly" ? "Mostly" : "Not yet";
  return "Done";
}

function UndoLink({ onClick, label = "Undo" }: { onClick: () => void; label?: string }) {
  return (
    <button className="mt-2 text-[14px] text-muted underline-offset-4 hover:text-ink hover:underline" onClick={onClick}>
      {label}
    </button>
  );
}
