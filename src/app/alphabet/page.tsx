import { AlphabetModule } from "@/components/alphabet";
import { MoreTabs } from "@/components/nav";
import { PageTitle } from "@/components/ui";

export default function AlphabetPage() {
  return (
    <div>
      <MoreTabs />
      <PageTitle en="Sounds and letters" tr="Alfabe ve telaffuz" />
      <AlphabetModule />
    </div>
  );
}
