import { AlphabetModule } from "@/components/alphabet";
import { MoreTabs } from "@/components/nav";
import { PageTitle } from "@/components/ui";

export default function AlphabetPage() {
  return (
    <div>
      <MoreTabs />
      <PageTitle en="Alphabet" tr="Alfabe" lede="Turkish is spelled the way it sounds. Learn 29 letters once and you can read anything." />
      <AlphabetModule />
    </div>
  );
}
