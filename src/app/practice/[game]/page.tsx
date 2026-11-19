import { notFound } from "next/navigation";
import vocabJson from "../../../../data/vocab.json";
import { ClockGame, HarmonyGame, LightningGame, ListenGame, MatchGame, NumbersGame } from "@/components/practice/games";
import { PracticeHeader } from "@/components/practice/header";
import { ClientOnly } from "@/components/practice/shared";
import { getActivity } from "@/lib/db/activity";
import { practiceWords } from "@/lib/db/cards";
import { nounEntry } from "@/lib/grammar/drills";
import { GAMES } from "@/lib/practice/catalog";
import type { VocabEntry } from "@/lib/vocab/types";

const VOCAB = vocabJson as VocabEntry[];

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = GAMES.find((x) => x.id === game);
  return { title: g ? `${g.title} · Türkçe 365` : "Practice · Türkçe 365" };
}

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = GAMES.find((x) => x.id === game);
  if (!g) notFound();
  const [words, activity] = await Promise.all([practiceWords(), getActivity()]);
  const best = activity.games[g.id]?.best;
  // Harmony practice works on everyday nouns from the first 30 units.
  const nouns =
    g.id === "harmony"
      ? VOCAB.filter((v) => v.pos === "noun" && v.unit <= 30 && !v.tr.includes(" ") && !v.tr.includes("/") && !v.noDrill && !v.compound).map((v) => ({ ...nounEntry(v), en: v.en }))
      : [];
  return (
    <div className="mx-auto max-w-[760px]">
      <PracticeHeader title={g.title} tr={g.tr} lede={g.how} />
      <ClientOnly>
      {g.id === "match" ? <MatchGame words={words} best={best} /> : null}
      {g.id === "harmony" ? <HarmonyGame nouns={nouns} best={best} /> : null}
      {g.id === "numbers" ? <NumbersGame best={best} /> : null}
      {g.id === "clock" ? <ClockGame best={best} /> : null}
      {g.id === "listen" ? <ListenGame words={words} best={best} /> : null}
      {g.id === "lightning" ? <LightningGame words={words} best={best} /> : null}
      </ClientOnly>
    </div>
  );
}
