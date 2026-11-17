"use client";

import { useActionState } from "react";
import { Field } from "../login/login-form";
import { changePasswordAction, updateNameAction } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [msg, action, pending] = useActionState(updateNameAction, null);
  return (
    <form action={action} className="flex max-w-md flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <Field label="Shown in the app and to the admin">
          <input name="name" className="input mt-1.5" defaultValue={name} maxLength={60} required />
        </Field>
      </div>
      <button className="btn-secondary" disabled={pending}>
        Save
      </button>
      {msg ? <p className={`w-full text-[14px] ${msg === "Saved." ? "text-ok-text" : "text-bad-text"}`}>{msg}</p> : null}
    </form>
  );
}

export function PasswordForm() {
  const [error, action, pending] = useActionState(changePasswordAction, null);
  return (
    <form action={action} className="max-w-md space-y-4">
      <Field label="Current password">
        <input name="current" type="password" className="input mt-1.5" autoComplete="current-password" required />
      </Field>
      <Field label="New password, at least 8 characters">
        <input name="password" type="password" className="input mt-1.5" autoComplete="new-password" required />
      </Field>
      <Field label="Type the new one again">
        <input name="confirm" type="password" className="input mt-1.5" autoComplete="new-password" required />
      </Field>
      {error ? (
        <p className="animate-shake rounded-[10px] bg-bad-tint px-4 py-2.5 text-[15px] text-bad-text" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
