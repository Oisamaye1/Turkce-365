"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ setup, legacy, next }: { setup: boolean; legacy: boolean; next: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const error = state?.error;
  const v = state?.values ?? {};
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      {setup ? (
        <Field label="Your name">
          <input name="name" className="input mt-1.5" autoComplete="name" required maxLength={60} defaultValue={v.name} />
        </Field>
      ) : null}
      <Field label="Username" hint={setup ? "3–24 characters: letters, numbers, dots, dashes or underscores." : undefined}>
        <input name="username" className="input mt-1.5" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus required defaultValue={v.username} />
      </Field>
      <Field label={setup ? (legacy ? "Your current password" : "Password, at least 8 characters") : "Password"}>
        <input name="password" type="password" className="input mt-1.5" autoComplete={setup && !legacy ? "new-password" : "current-password"} required />
      </Field>
      {setup && !legacy ? (
        <Field label="Type it again">
          <input name="confirm" type="password" className="input mt-1.5" autoComplete="new-password" required />
        </Field>
      ) : null}
      {error ? (
        <p key={error + String(pending)} className="animate-shake rounded-[10px] bg-bad-tint px-4 py-2.5 text-[15px] text-bad-text" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "One moment…" : setup ? "Create the admin account" : "Sign in"}
      </button>
      {!setup ? <p className="text-[14px] text-muted">Forgot your password? Ask the person who invited you to reset it.</p> : null}
    </form>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[15px] font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}
