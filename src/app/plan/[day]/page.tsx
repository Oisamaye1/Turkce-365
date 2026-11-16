import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconArrow, IconCheck } from "@/components/icons";
import { PlanDayChecklist } from "@/components/plan/plan-day";
import { Speak } from "@/components/speech";
import { getPlanRows } from "@/lib/db/plan";
import { DAY_KIND_LABEL, PLAN_DAYS, firstDayOfWeek, planDay } from "@/lib/plan/build";
import { planDayProps } from "@/lib/plan/props";

export default async function PlanDayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day: raw } = await params;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > PLAN_DAYS) notFound();
  const data = await planDayProps(n);
  if (!data) redirect("/plan");
  const { view, props } = data;
  const d = view.day;
  const rows = await getPlanRows();
  const wf = firstDayOfWeek(d.week);
  const weekDays = d.day === PLAN_DAYS ? [PLAN_DAYS] : Array.from({ length: 7 }, (_, i) => wf + i);
  const status = (x: number) => (x < view.plan.startDay || rows.get(x)?.completedAt ? "done" : x === view.current ? "current" : "later");

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-[14px] text-muted" aria-label="Breadcrumb">
        <Link href="/plan" className="hover:text-ink">
          Plan
        </Link>
        <span aria-hidden="true">/</span>
        <span>
          Week {d.week}, {d.weekInfo.title}
        </span>
      </nav>

      <header className="mb-10">
        <p className="text-[15px] text-muted">
          Day {d.day} of 365, {DAY_KIND_LABEL[d.kind].en.toLowerCase()} day, about {d.minutes} minutes
        </p>
        <h1 className="display-xl mt-2 text-[44px] sm:text-[64px]">{d.title}</h1>
        <p className="mt-2 text-[17px] text-ink-soft" lang="tr">
          {d.titleTr}
        </p>
        {view.isCurrent ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-tint px-3 py-1 text-[14px] text-accent-text">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> This is your day now
          </p>
        ) : props.completed ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-ok-tint px-3 py-1 text-[14px] text-ok-text">
            <IconCheck size={14} /> Finished
          </p>
        ) : null}
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="Tasks" className="min-w-0">
          <PlanDayChecklist {...props} />
          <div className="mt-10 flex justify-between gap-3">
            {d.day > 1 ? (
              <Link href={`/plan/${d.day - 1}`} className="btn-quiet">
                <IconArrow size={16} className="rotate-180" /> Day {d.day - 1}
              </Link>
            ) : (
              <span />
            )}
            {d.day < PLAN_DAYS ? (
              <Link href={`/plan/${d.day + 1}`} className="btn-quiet">
                Day {d.day + 1} <IconArrow size={16} />
              </Link>
            ) : null}
          </div>
        </section>

        <aside className="space-y-10">
          <section>
            <h2 className="text-[15px] text-muted">This week's goal</h2>
            <p className="font-display mt-2 text-[21px] leading-snug font-semibold">{d.weekInfo.goal}</p>
            <ol className="mt-5 border-t border-line">
              {weekDays.map((x) => {
                const pd = planDay(x);
                const st = status(x);
                return (
                  <li key={x}>
                    <Link
                      href={`/plan/${x}`}
                      aria-current={x === d.day ? "page" : undefined}
                      className={`flex items-center gap-3 border-b border-line py-2.5 pl-2 text-[15px] transition-colors hover:bg-haze ${x === d.day ? "bg-haze font-medium" : ""}`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                          st === "done" ? "bg-ok text-white" : st === "current" ? "bg-accent text-white" : "border border-line-strong text-muted"
                        }`}
                      >
                        {st === "done" ? <IconCheck size={11} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{pd.title}</span>
                      <span className="pr-2 text-[12px] text-muted tabular">{x}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          {props.words.length ? (
            <section>
              <h2 className="text-[15px] text-muted">New words today</h2>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {props.words.map((w) => (
                  <li key={w.tr} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="tr-word block text-[17px]" lang="tr">
                        {w.tr}
                      </span>
                      <span className="block truncate text-[13px] text-ink-soft">{w.en}</span>
                    </span>
                    <Speak text={w.tr} size="sm" />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[13px] text-muted">They arrive as new cards in your reviews.</p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
