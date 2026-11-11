import { MissionCard } from "@/components/mission-card";
import { PageTitle } from "@/components/ui";
import { ensureMission, listMissions } from "@/lib/db/missions";
import { today } from "@/lib/db/settings";

export default function MissionsPage() {
  const current = ensureMission(today());
  const past = listMissions().filter((m) => m.week !== current.week);
  return (
    <div className="space-y-5">
      <PageTitle en="Missions" tr="Görevler">
        <span className="text-sm text-muted">One real-life task each week · Her hafta bir görev</span>
      </PageTitle>
      <MissionCard row={current} current />
      {past.length ? (
        <section className="space-y-3">
          <h2 className="font-semibold">
            Past missions <span className="label-tr">· Geçmiş görevler</span>
          </h2>
          {past.map((m) => (
            <MissionCard key={m.week} row={m} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
