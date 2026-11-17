"use client";

import { useActionState, useState } from "react";
import { normalizeUsername, usernameProblem } from "@/lib/users/username";
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
      {setup ? (
        <UsernameField defaultValue={v.username} autoFocus />
      ) : (
        <Field label="Username">
          <input name="username" className="input mt-1.5" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus required defaultValue={v.username} />
        </Field>
      )}
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

/** Username input that shows the sign-in name it becomes, and any problem, as you type. */
export function UsernameField({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const [raw, setRaw] = useState(defaultValue);
  const [touched, setTouched] = useState(!!defaultValue);
  const name = normalizeUsername(raw);
  const problem = raw.trim() ? usernameProblem(name) : null;
  return (
    <label className="block">
      <span className="text-[15px] font-medium">Username</span>
      <input
        name="username"
        className={`input mt-1.5 ${touched && problem ? "!border-bad" : ""}`}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        required
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={touched && !!problem}
        aria-describedby="username-help"
      />
      <span id="username-help" className="mt-1 block text-[13px]" aria-live="polite">
        {touched && problem ? (
          <span className="text-bad-text">{problem}</span>
        ) : raw.trim() && name !== raw.trim() ? (
          <span className="text-ink-soft">
            You&apos;ll sign in as <b className="font-semibold text-ink">{name}</b>
          </span>
        ) : (
          <span className="text-muted">You&apos;ll sign in with this. Your name, a nickname or your email all work.</span>
        )}
      </span>
    </label>
  );
}
