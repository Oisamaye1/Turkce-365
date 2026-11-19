import vocabJson from "../../../../data/vocab.json";
import { WordLab, type LabNoun, type LabVerb } from "@/components/lab/word-lab";
import { PracticeHeader } from "@/components/practice/header";
import { nounEntry, verbEntry } from "@/lib/grammar/drills";
import type { VocabEntry } from "@/lib/vocab/types";

export const metadata = { title: "Word Lab · Türkçe 365" };

const VOCAB = vocabJson as VocabEntry[];
const simple = (v: VocabEntry) => !v.tr.includes("/") && !v.noDrill;

export default function LabPage() {
  const nouns: LabNoun[] = VOCAB.filter((v) => v.pos === "noun" && simple(v) && !v.tr.includes(" ")).map((v) => ({ ...nounEntry(v), en: v.en }));
  const verbs: LabVerb[] = VOCAB.filter((v) => v.pos === "verb" && simple(v) && v.aorist).map((v) => ({ ...verbEntry(v), en: v.en }));
  return (
    <div>
      <PracticeHeader
        title="Word Lab"
        tr="Kelime laboratuvarı"
        lede="Pick a word and choose its endings. Watch it build, piece by piece, with every rule explained."
      />
      <WordLab nouns={nouns} verbs={verbs} />
    </div>
  );
}
