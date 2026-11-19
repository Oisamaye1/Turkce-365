import unitsJson from "../../../data/units.json";
import { MoreTabs } from "@/components/nav";
import { Dictionary } from "@/components/read/dictionary";
import { PracticeHeader } from "@/components/practice/header";
import { dictionary } from "@/lib/db/cards";

export const metadata = { title: "Dictionary · Türkçe 365" };

export default async function WordsPage() {
  const words = await dictionary();
  const units = (unitsJson as { unit: number; title: string }[]).map((u) => ({ unit: u.unit, title: u.title }));
  return (
    <div>
      <MoreTabs />
      <PracticeHeader
        title="Dictionary"
        tr="Sözlük"
        lede={`All ${words.length.toLocaleString("en-GB")} words in the app, with examples and your progress. Start any word early with “Learn it now”.`}
        back={{ href: "/read", label: "Read" }}
      />
      <Dictionary words={words} units={units} />
    </div>
  );
}
