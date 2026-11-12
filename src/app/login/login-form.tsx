"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ setup, next }: { setup: boolean; next: string }) {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="card space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1">
        <span className="text-sm">{setup ? "New password (8+ characters)" : "Password · Şifre"}</span>
        <input name="password" type="password" className="input" autoComplete={setup ? "new-password" : "current-password"} autoFocus required />
      </label>
      {setup ? (
        <label className="block space-y-1">
          <span className="text-sm">Repeat password</span>
          <input name="confirm" type="password" className="input" autoComplete="new-password" required />
        </label>
      ) : null}
      {error ? <p className="text-sm text-bad">{error}</p> : null}
      <button className="btn-primary w-full" disabled={pending}>
        {setup ? "Save & start · Başla" : "Log in · Giriş"}
      </button>
      {setup ? <p className="text-xs text-muted">Your browser stays logged in for a year. Only this password protects your data — keep it safe.</p> : null}
    </form>
  );
}
