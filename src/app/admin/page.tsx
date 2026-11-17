import Link from "next/link";
import { relTime } from "@/lib/admin/format";
import { learnerSnapshot } from "@/lib/admin/snapshot";
import { IconArrow, IconFlame } from "@/components/icons";
import { CountUp } from "@/components/count-up";
import { lastWorkerSeen } from "@/lib/db/jobs";
import { sessionUser } from "@/lib/users/session";
import { listCodes, listUsers } from "@/lib/users/store";
import { codeState } from "@/lib/users/types";

export default async function AdminHome() {
  const me = (await sessionUser())!;
  const [users, codes, worker] = await Promise.all([listUsers(), listCodes(), lastWorkerSeen()]);
  const snaps = await Promise.all(users.map((u) => learnerSnapshot(u)));
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const activeWeek = snaps.filter((s) => s.lastActive && s.lastActive >= weekAgo).length;
  const openCodes = codes.filter((c) => codeState(c) === "open").length;
  const paused = users.filter((u) => u.status === "disabled").length;

  const figures = [
    { k: "learners", v: users.length, hint: paused ? `${paused} paused` : "all active" },
    { k: "practised this week", v: activeWeek, hint: `of ${users.length}` },
    { k: "open signup codes", v: openCodes, hint: openCodes ? "waiting to be used" : "make one to invite someone" },
  ];

  return (
    <div className="space-y-12">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <dl className="stagger grid flex-1 grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          {figures.map((f, i) => (
            <div key={f.k} style={{ "--i": i } as React.CSSProperties}>
              <dd className="font-display text-[42px] leading-none font-semibold">
                <CountUp value={f.v} />
              </dd>
              <dt className="mt-1.5 text-[15px]">{f.k}</dt>
              <p className="text-[13px] text-muted">{f.hint}</p>
            </div>
          ))}
          <div style={{ "--i": 3 } as React.CSSProperties}>
            <dd className="font-display text-[21px] leading-[42px] font-semibold">{relTime(worker)}</dd>
            <dt className="mt-1.5 text-[15px]">AI helper last ran</dt>
            <p className="text-[13px] text-muted">on your computer, for everyone</p>
          </div>
        </dl>
        <Link href="/admin/codes" className="btn-primary">
          Invite someone <IconArrow size={16} />
        </Link>
      </section>

      <section>
        <h2 className="font-display mb-3 text-[21px] font-semibold">Learners</h2>
        <div className="overflow-x-auto rounded-[14px] border border-line">
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <thead className="border-b border-line bg-haze text-[13px] text-muted">
              <tr>
                <th className="px-4 py-2.5 font-normal">Learner</th>
                <th className="px-4 py-2.5 font-normal">Plan</th>
                <th className="px-4 py-2.5 font-normal">Streak</th>
                <th className="px-4 py-2.5 font-normal">Words</th>
                <th className="px-4 py-2.5 font-normal">Last practised</th>
                <th className="px-4 py-2.5 font-normal">Joined</th>
              </tr>
            </thead>
            <tbody className="stagger divide-y divide-line">
              {users.map((u, i) => {
                const s = snaps[i];
                return (
                  <tr key={u.id} className="group relative transition-colors hover:bg-haze" style={{ "--i": i } as React.CSSProperties}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-tint font-display text-[14px] font-semibold text-brand-text">
                          {u.name.charAt(0).toLocaleUpperCase("tr")}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-medium text-ink">
                            {u.name}
                            {u.id === me.id ? <span className="text-[13px] font-normal text-muted">you</span> : null}
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                            @{u.username}
                            {u.role === "admin" ? <span className="pill bg-brand-tint text-brand-text">admin</span> : null}
                            {u.status === "disabled" ? <span className="pill bg-warn-tint text-warn-text">paused</span> : null}
                            {!u.aiEnabled ? <span className="pill bg-haze text-ink-soft">offline lessons</span> : null}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular">
                      {s.plan ? (
                        <>
                          <span className="text-ink">Day {s.plan.day}</span>
                          <span className="block text-[13px] text-muted">{s.plan.stage}</span>
                        </>
                      ) : (
                        <span className="text-muted">No plan yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular">
                      <span className="inline-flex items-center gap-1">
                        <IconFlame size={15} className={s.streak ? "text-accent" : "text-muted"} />
                        {s.streak}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular">{s.wordsMet}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.activeToday ? <span className="text-ok-text">today</span> : relTime(s.lastActive)}</td>
                    <td className="px-4 py-3 text-ink-soft">{relTime(u.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
