import Link from "next/link";
import { headers } from "next/headers";
import { CodeGenerator, RevokeButton } from "@/components/admin/codes";
import { CopyButton } from "@/components/admin/admin-ui";
import { relTime } from "@/lib/admin/format";
import { listCodes } from "@/lib/users/store";
import { codeState, type CodeState } from "@/lib/users/types";

const STATE: Record<CodeState, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-ok-tint text-ok-text" },
  used: { label: "Used", cls: "bg-haze text-ink-soft" },
  expired: { label: "Expired", cls: "bg-warn-tint text-warn-text" },
  revoked: { label: "Revoked", cls: "bg-bad-tint text-bad-text" },
};

export default async function CodesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const sp = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const all = await listCodes();
  const show = sp.show === "all" ? "all" : "open";
  const codes = show === "all" ? all : all.filter((c) => codeState(c) === "open");

  return (
    <div className="grid gap-12 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section>
        <h2 className="font-display text-[21px] font-semibold">Make signup codes</h2>
        <p className="mt-1 text-[15px] text-ink-soft">Each code creates exactly one account. Send the code, or the link that fills it in.</p>
        <CodeGenerator base={base} />
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[21px] font-semibold">{show === "all" ? "All codes" : "Open codes"}</h2>
          <Link href={show === "all" ? "/admin/codes" : "/admin/codes?show=all"} className="btn-quiet">
            {show === "all" ? "Show open only" : `Show all ${all.length}`}
          </Link>
        </div>
        {codes.length ? (
          <ul className="stagger divide-y divide-line rounded-[14px] border border-line">
            {codes.map((c, i) => {
              const st = codeState(c);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" style={{ "--i": i } as React.CSSProperties}>
                  <span className={`font-display text-[19px] font-semibold tracking-[0.08em] ${st === "open" ? "text-ink" : "text-muted line-through decoration-1"}`}>{c.code}</span>
                  <span className={`pill ${STATE[st].cls}`}>{STATE[st].label}</span>
                  {c.role === "admin" ? <span className="pill bg-brand-tint text-brand-text">admin</span> : null}
                  <span className="min-w-0 flex-1 text-[14px] text-ink-soft">
                    {c.note ? <span className="text-ink">{c.note}. </span> : null}
                    {st === "used" ? (
                      <>
                        Used {relTime(c.usedAt)} by{" "}
                        {c.usedBy ? (
                          <Link href={`/admin/users/${c.usedBy}`} className="text-brand-text hover:underline">
                            {c.usedByName ?? "a learner"}
                          </Link>
                        ) : (
                          "a deleted account"
                        )}
                      </>
                    ) : st === "open" ? (
                      c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Never expires"
                    ) : (
                      `Made ${relTime(c.createdAt)}`
                    )}
                  </span>
                  {st === "open" ? (
                    <span className="flex items-center gap-1">
                      <CopyButton text={c.code} label="Code" />
                      <CopyButton text={`${base}/signup?code=${c.code}`} label="Link" />
                      <RevokeButton id={c.id} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-[14px] border border-dashed border-line-strong p-6 text-ink-soft">
            {show === "all" ? "No codes yet." : "No open codes. Make one on the left to invite someone."}
          </p>
        )}
      </section>
    </div>
  );
}
