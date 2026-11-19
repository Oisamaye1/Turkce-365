import Link from "next/link";
import { IconArrow, IconCheck } from "@/components/icons";
import { MoreTabs } from "@/components/nav";
import { PageTitle } from "@/components/ui";
import { getActivity } from "@/lib/db/activity";
import { CHAPTERS } from "@/lib/learn/chapters";

export const metadata = { title: "How Turkish works · Türkçe 365" };

export default async function LearnPage() {
  const activity = await getActivity();
  const done = CHAPTERS.filter((c) => activity.learn[c.id]).length;
  const next = CHAPTERS.find((c) => !activity.learn[c.id]);
  return (
    <div>
      <MoreTabs />
      <PageTitle
        en="How Turkish works"
        tr="Türkçe nasıl çalışır"
        lede="Ten short chapters on how Turkish builds its words and sentences. Read one in ten minutes; each ends with a quick check."
      />
      <div className="mb-10 flex flex-wrap items-center gap-4">
        {next ? (
          <Link href={`/learn/${next.id}`} className="btn-primary">
            {done ? "Continue" : "Start"}: {next.title} <IconArrow size={16} />
          </Link>
        ) : (
          <p className="font-medium text-ok-text">All ten chapters done. Tebrikler!</p>
        )}
        <span className="text-[15px] text-muted tabular">
          {done} of {CHAPTERS.length} done
        </span>
        <Link href="/practice/lab" className="btn-quiet">
          Open the Word Lab <IconArrow size={16} />
        </Link>
      </div>
      <ol className="stagger divide-y divide-line border-y border-line">
        {CHAPTERS.map((c, i) => {
          const a = activity.learn[c.id];
          return (
            <li key={c.id} style={{ "--i": i } as React.CSSProperties}>
              <Link href={`/learn/${c.id}`} className="group flex items-center gap-5 py-5 transition-colors hover:bg-haze sm:px-3">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-[17px] font-semibold tabular ${
                    a ? "bg-ok text-white" : c.id === next?.id ? "bg-accent text-white" : "border border-line-strong text-ink-soft"
                  }`}
                >
                  {a ? <IconCheck size={18} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-[21px] font-semibold">{c.title}</span>
                    <span className="text-[15px] text-muted" lang="tr">
                      {c.titleTr}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[15px] text-ink-soft">{c.summary}</span>
                </span>
                <span className="hidden shrink-0 text-right text-[13px] text-muted sm:block">
                  {a ? `${a.score}/${a.total} on the quiz` : `goes with plan week ${c.week}`}
                </span>
                <IconArrow size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-1" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
