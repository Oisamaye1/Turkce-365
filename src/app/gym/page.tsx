import { Gym } from "@/components/gym";
import { PageTitle } from "@/components/ui";
import { currentGrammarStep, getStepStatuses } from "@/lib/db/grammar";
import { GRAMMAR_STEPS } from "@/lib/grammar/steps";

export default async function GymPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const sp = await searchParams;
  const statuses = await getStepStatuses();
  const requested = Number(sp.step);
  const initial = statuses.find((s) => s.stepId === requested && s.unlocked) ? requested : await currentGrammarStep();
  return (
    <div>
      <PageTitle en="Suffix gym" tr="Ek antrenmanı — build words one suffix at a time" />
      <Gym steps={GRAMMAR_STEPS} statuses={statuses} initialStep={initial} />
    </div>
  );
}
