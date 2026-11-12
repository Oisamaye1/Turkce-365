import { MissionCard } from "@/components/mission-card";
import { MoreTabs } from "@/components/nav";
import { PageTitle } from "@/components/ui";
import { ensureMission, listMissions } from "@/lib/db/missions";
import { today } from "@/lib/db/settings";

export default async function MissionsPage() {
  const current = await ensureMission(await today());
  const past = (await listMissions()).filter((m) => m.week !== current.week);
  return (
    <div>
      <MoreTabs />
      <PageTitle en="Missions" tr="Görevler — one real conversation a week" />
      <MissionCard row={current} current />
      {past.length ? (
        <section className="mt-10">
          <h2 className="font-display mb-3 text-xl font-extrabold">Earlier missions</h2>
          <div className="space-y-3">
            {past.map((m) => (
              <MissionCard key={m.week} row={m} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
