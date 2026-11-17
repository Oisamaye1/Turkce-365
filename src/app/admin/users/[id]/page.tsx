import Link from "next/link";
import { notFound } from "next/navigation";
import { UserControls } from "@/components/admin/user-controls";
import { ActivityChart } from "@/components/progress-charts";
import { IconArrow, IconFlame } from "@/components/icons";
import { ProgressBar } from "@/components/ui";
import { relTime } from "@/lib/admin/format";
import { learnerActivity, learnerSnapshot } from "@/lib/admin/snapshot";
import { PLAN_DAYS } from "@/lib/plan/build";
import { sessionUser } from "@/lib/users/session";
import { getUserById, listAudit, listCodes } from "@/lib/users/store";
import { ACTION_LABEL } from "@/lib/admin/format";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserById(Number(id));
  if (!user) notFound();
  const me = (await sessionUser())!;
  const [snap, act, log, codes] = await Promise.all([learnerSnapshot(user), learnerActivity(user), listAudit(30, user.id), listCodes(500)]);
  const invite = codes.find((c) => c.id === user.inviteCodeId);

  const figures = [
    { k: "day streak", v: snap.streak, hint: `best ${snap.bestStreak}` },
    { k: "words met", v: snap.wordsMet, hint: `${snap.wordsMature} well learned` },
    { k: "reviews done", v: snap.reviewsTotal, hint: `${snap.reviewsDue} due now` },
    { k: "lessons finished", v: snap.lessonsDone, hint: `${snap.writings} texts written` },
  ];

  return (
    <div>
      <Link href="/admin" className="btn-quiet -ml-2 mb-6">
        <IconArrow size={16} className="rotate-180" /> All learners
      </Link>
      <header className="flex flex-wrap items-center gap-5">
        <span className="grid h-16 w-16 animate-pop place-items-center rounded-full bg-brand-tint font-display text-[28px] font-semibold text-brand-text">
          {user.name.charAt(0).toLocaleUpperCase("tr")}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[33px] leading-tight font-semibold">{user.name}</h2>
          <p className="flex flex-wrap items-center gap-2 text-[15px] text-muted">
            @{user.username}
            {user.role === "admin" ? <span className="pill bg-brand-tint text-brand-text">admin</span> : <span className="pill bg-haze text-ink-soft">learner</span>}
            {user.status === "disabled" ? <span className="pill bg-warn-tint text-warn-text">paused</span> : null}
            {user.mustChangePassword ? <span className="pill bg-warn-tint text-warn-text">temporary password</span> : null}
          </p>
          <p className="mt-1 text-[14px] text-muted">
            Joined {relTime(user.createdAt)}
            {invite ? ` with code ${invite.code}${invite.note ? ` (${invite.note})` : ""}` : user.schemaName === "turkce" ? ", the original account" : ""}. Last signed in{" "}
            {relTime(user.lastLoginAt)}, last seen {relTime(user.lastSeenAt)}.
          </p>
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          {snap.error ? (
            <p className="rounded-[14px] bg-bad-tint p-4 text-bad-text">Couldn't read this learner's data: {snap.error}</p>
          ) : null}
          <dl className="stagger grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {figures.map((f, i) => (
              <div key={f.k} style={{ "--i": i } as React.CSSProperties}>
                <dd className="font-display flex items-center gap-1.5 text-[36px] leading-none font-semibold tabular">
                  {f.k === "day streak" ? <IconFlame size={24} className={snap.streak ? "text-accent" : "text-muted"} /> : null}
                  {f.v}
                </dd>
                <dt className="mt-1.5 text-[15px]">{f.k}</dt>
                <p className="text-[13px] text-muted">{f.hint}</p>
              </div>
            ))}
          </dl>

          <section>
            <h3 className="font-display text-[21px] font-semibold">Plan</h3>
            {snap.plan ? (
              <div className="mt-3">
                <p className="text-ink-soft">
                  Day <b className="text-ink">{snap.plan.day}</b> of 365: {snap.plan.title}. Week {snap.plan.week}, {snap.plan.stage}. Started {relTime(snap.plan.startedOn)}.
                </p>
                <div className="mt-3 flex max-w-md items-center gap-3">
                  <ProgressBar value={snap.plan.daysDone} max={PLAN_DAYS} tone="accent" />
                  <span className="shrink-0 text-[14px] text-muted tabular">{snap.plan.daysDone} days done</span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-ink-soft">Hasn&apos;t built a plan yet.</p>
            )}
          </section>

          <section>
            <h3 className="font-display text-[21px] font-semibold">Last four weeks</h3>
            <p className="text-[14px] text-muted">Reviews and suffix drills per day</p>
            <div className="mt-3">
              <ActivityChart data={act.activity} />
            </div>
          </section>

          <section>
            <h3 className="font-display text-[21px] font-semibold">History</h3>
            {log.length ? (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {log.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-[15px]">
                    <span>
                      {ACTION_LABEL[e.action] ?? e.action}
                      {e.actorId !== user.id && e.actorName ? <span className="text-muted"> by {e.actorName}</span> : null}
                      {e.detail ? <span className="text-muted">. {e.detail}</span> : null}
                    </span>
                    <span className="text-[13px] text-muted">{relTime(e.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-ink-soft">Nothing recorded yet.</p>
            )}
          </section>
        </div>

        <aside>
          <UserControls
            user={{ id: user.id, name: user.name, username: user.username, role: user.role, status: user.status, aiEnabled: user.aiEnabled, original: user.schemaName === "turkce" }}
            isSelf={user.id === me.id}
          />
        </aside>
      </div>
    </div>
  );
}
