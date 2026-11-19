import { notFound } from "next/navigation";
import { PracticeHeader } from "@/components/practice/header";
import { Reader } from "@/components/read/reader";
import { getActivity } from "@/lib/db/activity";
import { dictionary } from "@/lib/db/cards";
import { analyzeText } from "@/lib/lesson/analyze";
import { READ_BY_ID } from "@/lib/read/library";
import { trLower } from "@/lib/turkish/text";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const x = READ_BY_ID.get(id);
  return { title: x ? `${x.title} · Türkçe 365` : "Read · Türkçe 365" };
}

export default async function ReadItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = READ_BY_ID.get(id);
  if (!item) notFound();
  const [activity, dict] = await Promise.all([getActivity(), dictionary()]);
  const analysis = analyzeText(item.lines.map((l) => l.tr).join(" "));
  // Only the dictionary entries this text can point at.
  const roots = new Set(Object.values(analysis).map((a) => trLower(a.root)));
  const lookup: Record<string, { id: number; started: boolean }> = {};
  for (const w of dict) if (roots.has(trLower(w.tr))) lookup[trLower(w.tr)] = { id: w.id, started: w.reps !== null };
  return (
    <div>
      <PracticeHeader
        title={item.title}
        tr={item.titleTr}
        lede={`${item.level}${item.kind === "conversation" ? ", conversation" : ", story"}. ${item.blurb}`}
        back={{ href: "/read", label: "Read" }}
      />
      <Reader id={item.id} lines={item.lines} analysis={analysis} dictionary={lookup} questions={item.questions} alreadyRead={!!activity.read[item.id]} />
    </div>
  );
}
