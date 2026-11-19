import Link from "next/link";
import { IconArrow, IconCheck } from "@/components/icons";
import { MoreTabs } from "@/components/nav";
import { PageTitle } from "@/components/ui";
import { getActivity } from "@/lib/db/activity";
import { LIBRARY } from "@/lib/read/library";

export const metadata = { title: "Read · Türkçe 365" };

export default async function ReadPage() {
  const activity = await getActivity();
  const stories = LIBRARY.filter((x) => x.kind === "story");
  const convos = LIBRARY.filter((x) => x.kind === "conversation");
  const row = (x: (typeof LIBRARY)[number], i: number) => {
    const read = !!activity.read[x.id];
    return (
      <li key={x.id} style={{ "--i": i } as React.CSSProperties}>
        <Link href={`/read/${x.id}`} className="group flex items-center gap-4 py-4 transition-colors hover:bg-haze sm:px-3">
          <span className={`w-12 shrink-0 rounded-md py-1 text-center text-[13px] font-medium ${read ? "bg-ok-tint text-ok-text" : "bg-haze text-ink-soft"}`}>
            {read ? <IconCheck size={14} className="inline" /> : x.level}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium text-ink">{x.title}</span>
              <span className="text-[14px] text-muted" lang="tr">
                {x.titleTr}
              </span>
            </span>
            <span className="block truncate text-[14px] text-ink-soft">{x.blurb}</span>
          </span>
          <IconArrow size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-1" />
        </Link>
      </li>
    );
  };
  return (
    <div>
      <MoreTabs />
      <PageTitle en="Read" tr="Oku" lede="Short stories and real conversations, from your first words to B1. Tap any word to see how it's built." />
      <div className="mb-10 flex flex-wrap gap-3">
        <Link href="/words" className="btn-secondary">
          Dictionary: every word in the app <IconArrow size={16} />
        </Link>
      </div>
      <div className="grid gap-12 lg:grid-cols-2">
        <section>
          <h2 className="font-display mb-2 text-[24px] font-semibold">Stories</h2>
          <p className="mb-3 text-[15px] text-muted">Graded from A0 to B1, with questions at the end.</p>
          <ol className="stagger divide-y divide-line border-y border-line">{stories.map(row)}</ol>
        </section>
        <section>
          <h2 className="font-display mb-2 text-[24px] font-semibold">Conversations</h2>
          <p className="mb-3 text-[15px] text-muted">Everyday dialogues set around Northern Cyprus.</p>
          <ol className="stagger divide-y divide-line border-y border-line">{convos.map(row)}</ol>
        </section>
      </div>
    </div>
  );
}
