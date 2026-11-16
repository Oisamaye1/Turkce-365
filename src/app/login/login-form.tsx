"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ setup, next }: { setup: boolean; next: string }) {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-[15px] font-medium">{setup ? "New password, at least 8 characters" : "Password"}</span>
        <input name="password" type="password" className="input mt-1.5" autoComplete={setup ? "new-password" : "current-password"} autoFocus required />
      </label>
      {setup ? (
        <label className="block">
          <span className="text-[15px] font-medium">Type it again</span>
          <input name="confirm" type="password" className="input mt-1.5" autoComplete="new-password" required />
        </label>
      ) : null}
      {error ? (
        <p className="rounded-[10px] bg-bad-tint px-4 py-2.5 text-[15px] text-bad-text" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "One moment…" : setup ? "Save password and start" : "Log in"}
      </button>
      {setup ? <p className="text-[14px] text-muted">This browser stays logged in for a year. The password is the only thing protecting your progress, so keep it safe.</p> : null}
    </form>
  );
}
