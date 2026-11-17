"use client";

import { useActionState } from "react";
import { signupAction } from "../login/actions";
import { Field } from "../login/login-form";

export function SignupForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(signupAction, null);
  const error = state?.error;
  const v = state?.values ?? {};
  return (
    <form action={action} className="mt-8 space-y-4">
      <Field label="Signup code">
        <input
          name="code"
          className="input font-display mt-1.5 tracking-[0.12em] uppercase"
          defaultValue={v.code ?? code}
          placeholder="ABCD-EFGH"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          autoFocus={!code}
        />
      </Field>
      <Field label="Your name">
        <input name="name" className="input mt-1.5" autoComplete="name" required maxLength={60} autoFocus={!!code} defaultValue={v.name} />
      </Field>
      <Field label="Username" hint="You'll sign in with this. 3–24 characters: letters, numbers, dots, dashes or underscores.">
        <input name="username" className="input mt-1.5" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required defaultValue={v.username} />
      </Field>
      <Field label="Password, at least 8 characters">
        <input name="password" type="password" className="input mt-1.5" autoComplete="new-password" required />
      </Field>
      <Field label="Type it again">
        <input name="confirm" type="password" className="input mt-1.5" autoComplete="new-password" required />
      </Field>
      {error ? (
        <p className="animate-shake rounded-[10px] bg-bad-tint px-4 py-2.5 text-[15px] text-bad-text" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Setting up your account…" : "Create my account"}
      </button>
    </form>
  );
}
