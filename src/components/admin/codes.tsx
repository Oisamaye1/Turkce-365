"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCodesAction, revokeCodeAction } from "@/app/admin/actions";
import { CopyButton } from "./admin-ui";

const EXPIRY = [
  { v: 7, label: "7 days" },
  { v: 30, label: "30 days" },
  { v: 0, label: "Never" },
];

export function CodeGenerator({ base }: { base: string }) {
  const router = useRouter();
  const [count, setCount] = useState(1);
  const [note, setNote] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [expires, setExpires] = useState(30);
  const [made, setMade] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      setError(null);
      const r = await createCodesAction({ count, note, role, expiresDays: expires });
      if (!r.ok) return setError(r.error ?? "Couldn't make codes.");
      setMade(r.codes ?? []);
      setNote("");
      router.refresh();
    });

  return (
    <div className="mt-5 space-y-5">
      <label className="block">
        <span className="text-[15px] font-medium">Who is it for?</span>
        <input className="input mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Ayşe from work" maxLength={80} />
        <span className="mt-1 block text-[13px] text-muted">Only you see this note.</span>
      </label>

      <div className="flex flex-wrap gap-6">
        <label className="block">
          <span className="block text-[15px] font-medium">How many</span>
          <input
            type="number"
            min={1}
            max={25}
            className="input mt-1.5 !w-24 tabular"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
          />
        </label>
        <fieldset>
          <legend className="text-[15px] font-medium">Expires after</legend>
          <div className="mt-1.5 inline-flex rounded-[10px] border border-line p-0.5" role="radiogroup">
            {EXPIRY.map((x) => (
              <button
                key={x.v}
                type="button"
                role="radio"
                aria-checked={expires === x.v}
                onClick={() => setExpires(x.v)}
                className={`h-10 rounded-[8px] px-3 text-[14px] transition-colors ${expires === x.v ? "bg-ink text-paper" : "text-ink-soft hover:bg-haze"}`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" checked={role === "admin"} onChange={(e) => setRole(e.target.checked ? "admin" : "user")} />
        <span>
          <span className="text-[15px] font-medium">Make them an admin</span>
          <span className="block text-[13px] text-muted">Admins can see every learner and make codes. Leave this off for learners.</span>
        </span>
      </label>

      <button className="btn-primary w-full" onClick={create} disabled={pending}>
        {pending ? "Making…" : count === 1 ? "Make a code" : `Make ${count} codes`}
      </button>
      {error ? <p className="text-bad-text">{error}</p> : null}

      {made.length ? (
        <div className="animate-rise rounded-[14px] bg-ok-tint p-4" role="status">
          <p className="font-medium text-ok-text">{made.length === 1 ? "Your new code" : `${made.length} new codes`}</p>
          <ul className="mt-2 space-y-2">
            {made.map((c) => (
              <li key={c} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-paper px-3 py-2">
                <span className="font-display text-[21px] font-semibold tracking-[0.08em]">{c}</span>
                <span className="flex gap-1">
                  <CopyButton text={c} label="Code" />
                  <CopyButton text={`${base}/signup?code=${c}`} label="Link" />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-ink-soft">The link opens the signup page with the code filled in.</p>
        </div>
      ) : null}
    </div>
  );
}

export function RevokeButton({ id }: { id: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm)
    return (
      <button className="rounded-lg px-2 py-1 text-[14px] text-muted transition-colors hover:bg-bad-tint hover:text-bad-text" onClick={() => setConfirm(true)}>
        Revoke
      </button>
    );
  return (
    <button
      className="animate-pop rounded-lg bg-bad-tint px-2 py-1 text-[14px] font-medium text-bad-text"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await revokeCodeAction(id);
          router.refresh();
        })
      }
      onBlur={() => setTimeout(() => setConfirm(false), 150)}
    >
      {pending ? "Revoking…" : "Sure? Revoke"}
    </button>
  );
}
