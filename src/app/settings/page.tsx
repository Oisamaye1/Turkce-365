import { SettingsForm } from "@/components/settings-form";
import { PageTitle } from "@/components/ui";
import { currentGrammarStep } from "@/lib/db/grammar";
import { lastWorkerSeen, recentJobs } from "@/lib/db/jobs";
import { dbLabel } from "@/lib/db";
import { getSettings } from "@/lib/db/settings";
import { GRAMMAR_STEPS } from "@/lib/grammar/steps";

export default async function SettingsPage() {
  const s = await getSettings();
  const jobs = await recentJobs(8);
  const workerSeen = await lastWorkerSeen();
  return (
    <div className="space-y-5">
      <PageTitle en="Settings" tr="Ayarlar" />
      <SettingsForm
        settings={s}
        jobs={jobs}
        dbFile={dbLabel()}
        online={process.env.TURKCE_DISABLE_CLAUDE === "1"}
        workerSeen={workerSeen}
        platform={process.platform}
        currentStep={await currentGrammarStep()}
        steps={GRAMMAR_STEPS.map((x) => ({ id: x.id, title: x.title }))}
      />
    </div>
  );
}
