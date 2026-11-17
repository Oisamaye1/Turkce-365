"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteUserAction, resetPasswordAction, setAiAction, setRoleAction, setStatusAction, signOutUserAction } from "@/app/admin/actions";
import { CopyButton } from "./admin-ui";

interface U {
  id: number;
  name: string;
  username: string;
  role: "admin" | "user";
  status: "active" | "disabled";
  aiEnabled: boolean;
  original: boolean;
}

export function UserControls({ user, isSelf }: { user: U; isSelf: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [del, setDel] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Done.") : (r.error ?? "That didn't work.") });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="space-y-8 lg:sticky lg:top-12">
      {msg ? (
        <p className={`animate-rise rounded-[12px] px-4 py-3 text-[15px] ${msg.ok ? "bg-ok-tint text-ok-text" : "bg-bad-tint text-bad-text"}`} role="status">
          {msg.text}
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-[15px] text-muted">Lessons</h3>
        <Toggle
          label="Claude writes lessons and corrects writing"
          hint="Off: offline lessons only, and no writing corrections. Claude runs on your computer, so every learner with this on uses your plan's limits."
          on={user.aiEnabled}
          disabled={pending}
          onChange={(v) => run(() => setAiAction(user.id, v))}
        />
      </section>

      {!isSelf ? (
        <section className="space-y-3 border-t border-line pt-6">
          <h3 className="text-[15px] text-muted">Access</h3>
          <div className="flex flex-col items-start gap-2">
            <button className="btn-secondary w-full" disabled={pending} onClick={() => run(() => setStatusAction(user.id, user.status === "active" ? "disabled" : "active"))}>
              {user.status === "active" ? "Pause account" : "Resume account"}
            </button>
            <button className="btn-secondary w-full" disabled={pending} onClick={() => run(() => signOutUserAction(user.id))}>
              Sign out on every device
            </button>
            <button
              className="btn-secondary w-full"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await resetPasswordAction(user.id);
                  if (r.ok && r.password) {
                    setTemp(r.password);
                    setMsg(null);
                    router.refresh();
                  } else setMsg({ ok: false, text: r.error ?? "That didn't work." });
                })
              }
            >
              Reset password
            </button>
            <button className="btn-quiet" disabled={pending} onClick={() => run(() => setRoleAction(user.id, user.role === "admin" ? "user" : "admin"))}>
              {user.role === "admin" ? "Make a learner (remove admin)" : "Make admin"}
            </button>
          </div>
          {temp ? (
            <div className="animate-rise rounded-[12px] bg-warn-tint p-4" role="status">
              <p className="text-[14px] text-ink-soft">Temporary password for {user.name}. It's shown once; they'll choose a new one when they sign in.</p>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] bg-paper px-3 py-2">
                <span className="font-display text-[19px] font-semibold tracking-wide">{temp}</span>
                <CopyButton text={temp} />
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="border-t border-line pt-6 text-[14px] text-muted">This is your account. Change your own name and password on the Account page.</p>
      )}

      {!isSelf && !user.original ? (
        <section className="space-y-3 rounded-[14px] border border-bad/30 p-4">
          <h3 className="font-medium text-bad-text">Delete account</h3>
          <p className="text-[14px] text-ink-soft">Removes {user.name} and all their progress for good. Type their username to confirm.</p>
          <input className="input" value={del} onChange={(e) => setDel(e.target.value)} placeholder={user.username} autoCapitalize="none" spellCheck={false} />
          <button
            className="btn-bad w-full"
            disabled={pending || del.trim().toLowerCase() !== user.username}
            onClick={() => run(() => deleteUserAction(user.id, del), () => router.push("/admin"))}
          >
            Delete {user.name}
          </button>
        </section>
      ) : null}
    </div>
  );
}

function Toggle({ label, hint, on, disabled, onChange }: { label: string; hint?: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="text-[15px] font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-[13px] text-muted">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-ok" : "bg-line-strong"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-spring)] ${on ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
