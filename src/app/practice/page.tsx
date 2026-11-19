import Link from "next/link";
import { WordAnatomy } from "@/components/anatomy";
import { IconArrow } from "@/components/icons";
import { MoreTabs } from "@/components/nav";
import { PageTitle } from "@/components/ui";
import { getActivity } from "@/lib/db/activity";
import { CHAPTERS } from "@/lib/learn/chapters";
import { GAMES } from "@/lib/practice/catalog";
import { STORIES } from "@/lib/read/stories";

export const metadata = { title: "Practice · Türkçe 365" };

export default async function PracticeHub() {
  const activity = await getActivity();
  const chaptersDone = CHAPTERS.filter((c) => activity.learn[c.id]).length;
  const storiesRead = STORIES.filter((s) => activity.read[s.id]).length;
  return (
    <div>
      <MoreTabs />
      <PageTitle en="Practice" tr="Pratik" lede="Extra ways to play with Turkish, alongside your daily plan. Nothing here is required; all of it helps." />

      {/* Explore: the three bigger tools */}
      <section className="mb-14 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Link href="/practice/lab" className="group relative overflow-hidden rounded-[18px] bg-brand p-6 text-white transition-transform active:scale-[0.99] sm:p-8">
          <p className="text-[14px] opacity-80">Build any word</p>
          <p className="font-display mt-1 text-[33px] leading-tight font-semibold">Word Lab</p>
          <p className="mt-2 max-w-[42ch] text-[16px] opacity-90">Pick a word, add endings, and see exactly how Turkish puts it together, with every rule explained.</p>
          <div className="mt-6 inline-flex flex-wrap items-end gap-1 rounded-[12px] bg-white/10 p-3 font-display text-[26px] font-semibold" lang="tr" aria-hidden="true">
            <span className="border-b-2 border-white px-1">ev</span>
            <span className="rounded bg-white/20 px-1.5">ler</span>
            <span className="rounded bg-white/20 px-1.5">imiz</span>
            <span className="rounded bg-accent px-1.5">den</span>
          </div>
          <IconArrow size={22} className="absolute top-7 right-7 transition-transform group-hover:translate-x-1" />
        </Link>
        <div className="grid gap-4">
          <Link href="/learn" className="group flex items-center gap-4 rounded-[18px] border border-line p-5 transition-colors hover:border-brand">
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[21px] font-semibold">How Turkish works</span>
              <span className="block text-[15px] text-ink-soft">10 short chapters on how words and sentences are built.</span>
              <span className="mt-1 block text-[13px] text-muted tabular">
                {chaptersDone} of {CHAPTERS.length} done
              </span>
            </span>
            <IconArrow size={18} className="text-brand-text transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/read" className="group flex items-center gap-4 rounded-[18px] border border-line p-5 transition-colors hover:border-brand">
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[21px] font-semibold">Read</span>
              <span className="block text-[15px] text-ink-soft">Graded stories, conversations and the dictionary. Tap any word.</span>
              <span className="mt-1 block text-[13px] text-muted tabular">
                {storiesRead} of {STORIES.length} stories read
              </span>
            </span>
            <IconArrow size={18} className="text-brand-text transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="games-h">
        <h2 id="games-h" className="font-display mb-1 text-[26px] font-semibold">
          Games
        </h2>
        <p className="mb-5 text-[15px] text-ink-soft">Five minutes each. They use the words you&apos;ve met so far.</p>
        <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g, i) => {
            const a = activity.games[g.id];
            return (
              <li key={g.id} style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/practice/${g.id}`} className="group flex h-full flex-col rounded-[16px] border border-line p-5 transition-[border-color,transform] duration-150 hover:border-ink-soft active:scale-[0.99]">
                  <span className="flex items-baseline gap-2 font-display" aria-hidden="true">
                    <span className="text-[30px] leading-none font-semibold text-ink" lang="tr">
                      {g.sample[0]}
                    </span>
                    <span className="text-muted">→</span>
                    <span className="truncate text-[17px] text-accent-text" lang="tr">
                      {g.sample[1]}
                    </span>
                  </span>
                  <span className="mt-4 flex items-baseline gap-2">
                    <span className="font-medium text-ink">{g.title}</span>
                    <span className="text-[13px] text-muted" lang="tr">
                      {g.tr}
                    </span>
                  </span>
                  <span className="mt-1 flex-1 text-[14px] text-ink-soft">{g.blurb}</span>
                  <span className="mt-4 flex items-center justify-between text-[13px] text-muted tabular">
                    <span>{a ? `Best ${a.best}, played ${a.plays}×` : "Not played yet"}</span>
                    <span className="font-medium text-brand-text transition-transform group-hover:translate-x-1">Play →</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="font-display text-[21px] font-semibold">More drills</h2>
        <p className="mt-1 max-w-[60ch] text-[15px] text-ink-soft">
          The Suffixes page drills all 22 grammar steps one at a time, and the Alphabet page has a listen-and-spell game.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/gym" className="btn-secondary">
            Suffix drills
          </Link>
          <Link href="/alphabet" className="btn-secondary">
            Alphabet
          </Link>
        </div>
      </section>
    </div>
  );
}
