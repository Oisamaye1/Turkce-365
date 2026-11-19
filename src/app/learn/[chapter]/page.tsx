import Link from "next/link";
import { notFound } from "next/navigation";
import { WordAnatomy, parseBreakdown } from "@/components/anatomy";
import { IconArrow } from "@/components/icons";
import { ChapterQuiz } from "@/components/learn/chapter-quiz";
import { PracticeHeader } from "@/components/practice/header";
import { Speak } from "@/components/speech";
import { CHAPTERS, CHAPTER_BY_ID } from "@/lib/learn/chapters";

export async function generateMetadata({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  const c = CHAPTER_BY_ID.get(chapter);
  return { title: c ? `${c.title} · Türkçe 365` : "How Turkish works" };
}

export default async function ChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  const c = CHAPTER_BY_ID.get(chapter);
  if (!c) notFound();
  const idx = CHAPTERS.indexOf(c);
  const next = CHAPTERS[idx + 1];
  const prev = CHAPTERS[idx - 1];
  return (
    <article className="mx-auto max-w-[760px]">
      <PracticeHeader title={c.title} tr={c.titleTr} lede={c.summary} back={{ href: "/learn", label: `Chapter ${idx + 1} of ${CHAPTERS.length}` }} />

      <div className="space-y-14">
        {c.sections.map((s, si) => (
          <section key={s.heading} aria-labelledby={`s-${si}`}>
            <h2 id={`s-${si}`} className="font-display text-[26px] leading-tight font-semibold">
              {s.heading}
            </h2>
            <div className="mt-3 space-y-3">
              {s.body.map((p, i) => (
                <p key={i} className="max-w-[64ch] text-[17px] leading-relaxed text-ink">
                  {p}
                </p>
              ))}
            </div>
            {s.table ? (
              <div className="mt-6 overflow-x-auto rounded-[12px] border border-line">
                <table className="w-full text-left text-[15px]">
                  <thead className="bg-haze text-[13px] text-muted">
                    <tr>
                      {s.table.head.map((h, i) => (
                        <th key={i} className="px-4 py-2.5 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.table.rows.map((r, ri) => (
                      <tr key={ri}>
                        {r.map((cell, ci) => (
                          <td key={ci} className={`px-4 py-2.5 ${ci === 0 ? "text-ink-soft" : "tr-word text-ink"}`} lang={ci === 0 ? undefined : "tr"}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {s.examples?.length ? (
              <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {s.examples.map((e) => (
                  <li key={e.tr} className="flex items-start justify-between gap-3 border-l-2 border-accent pl-4">
                    <div className="min-w-0">
                      {e.breakdown ? (
                        <WordAnatomy parts={parseBreakdown(e.breakdown)} size="md" />
                      ) : (
                        <p className="tr-word text-[21px] leading-snug" lang="tr">
                          {e.tr}
                        </p>
                      )}
                      {e.breakdown ? (
                        <p className="mt-1 text-[15px] text-ink" lang="tr">
                          {e.tr}
                        </p>
                      ) : null}
                      <p className="text-[14px] text-ink-soft">{e.en}</p>
                    </div>
                    <Speak text={e.tr} size="sm" />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {c.lab ? (
          <Link href="/practice/lab" className="group flex items-center gap-4 rounded-[14px] border border-line p-5 transition-colors hover:border-brand hover:bg-brand-tint/30">
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[19px] font-semibold">Try it in the Word Lab</span>
              <span className="text-[15px] text-ink-soft">Build {c.lab === "noun" ? "nouns" : "verbs"} yourself and watch these rules happen.</span>
            </span>
            <IconArrow size={18} className="text-brand-text transition-transform group-hover:translate-x-1" />
          </Link>
        ) : null}

        <section aria-labelledby="quiz-h" className="border-t border-line pt-10">
          <h2 id="quiz-h" className="font-display mb-5 text-[26px] font-semibold">
            Check yourself
          </h2>
          <ChapterQuiz id={c.id} questions={c.quiz} next={next ? { id: next.id, title: next.title } : undefined} />
        </section>

        <nav className="flex justify-between gap-3 border-t border-line pt-6" aria-label="Chapters">
          {prev ? (
            <Link href={`/learn/${prev.id}`} className="btn-quiet">
              <IconArrow size={16} className="rotate-180" /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/learn/${next.id}`} className="btn-quiet">
              {next.title} <IconArrow size={16} />
            </Link>
          ) : null}
        </nav>
      </div>
    </article>
  );
}
