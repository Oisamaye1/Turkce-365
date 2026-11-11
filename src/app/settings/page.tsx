import { SettingsForm } from "@/components/settings-form";
import { PageTitle } from "@/components/ui";
import { currentGrammarStep } from "@/lib/db/grammar";
import { recentJobs } from "@/lib/db/jobs";
import { dbPath } from "@/lib/db";
import { getSettings } from "@/lib/db/settings";
import { GRAMMAR_STEPS } from "@/lib/grammar/steps";

export default function SettingsPage() {
  const s = getSettings();
  const jobs = recentJobs(8);
  return (
    <div className="space-y-5">
      <PageTitle en="Settings" tr="Ayarlar" />
      <SettingsForm
        settings={s}
        jobs={jobs}
        dbFile={dbPath()}
        platform={process.platform}
        currentStep={currentGrammarStep()}
        steps={GRAMMAR_STEPS.map((x) => ({ id: x.id, title: x.title }))}
      />
    </div>
  );
}
