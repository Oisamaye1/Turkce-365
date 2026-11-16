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
      <PageTitle en="Missions" tr="Görevler" lede="One real conversation each week, somewhere in Northern Cyprus." />
      <MissionCard row={current} current />
      {past.length ? (
        <section className="mt-16">
          <h2 className="font-display mb-3 text-[21px] font-semibold">Earlier missions</h2>
          <div className="border-t border-line">
            {past.map((m) => (
              <MissionCard key={m.week} row={m} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
