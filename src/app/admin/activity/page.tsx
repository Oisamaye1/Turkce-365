import Link from "next/link";
import { ACTION_LABEL, relTime } from "@/lib/admin/format";
import { listAudit } from "@/lib/users/store";

export default async function ActivityPage() {
  const log = await listAudit(200);
  return (
    <section>
      <p className="mb-4 text-[15px] text-ink-soft">Sign-ups, sign-ins and every change made in this dashboard, newest first.</p>
      {log.length ? (
        <ol className="divide-y divide-line rounded-[14px] border border-line">
          {log.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-[15px]">
              <span className="min-w-0">
                {e.actorId ? (
                  <Link href={`/admin/users/${e.actorId}`} className="font-medium hover:underline">
                    {e.actorName ?? "Deleted account"}
                  </Link>
                ) : (
                  <span className="font-medium">System</span>
                )}{" "}
                <span className="text-ink-soft">{(ACTION_LABEL[e.action] ?? e.action).toLowerCase()}</span>
                {e.targetId && e.targetId !== e.actorId ? (
                  <>
                    {" "}
                    <span className="text-ink-soft">for</span>{" "}
                    <Link href={`/admin/users/${e.targetId}`} className="font-medium hover:underline">
                      {e.targetName ?? "a deleted account"}
                    </Link>
                  </>
                ) : null}
                {e.detail ? <span className="text-muted">. {e.detail}</span> : null}
              </span>
              <time className="shrink-0 text-[13px] text-muted" dateTime={e.at} title={new Date(e.at).toLocaleString("en-GB")}>
                {relTime(e.at)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-ink-soft">Nothing yet.</p>
      )}
    </section>
  );
}
