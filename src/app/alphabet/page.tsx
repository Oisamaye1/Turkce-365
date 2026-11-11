import { AlphabetModule } from "@/components/alphabet";
import { PageTitle } from "@/components/ui";

export default function AlphabetPage() {
  return (
    <div>
      <PageTitle en="Alphabet & Pronunciation" tr="Alfabe ve telaffuz" />
      <AlphabetModule />
    </div>
  );
}
