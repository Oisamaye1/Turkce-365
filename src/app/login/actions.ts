"use server";

import { redirect } from "next/navigation";
import { getUserDb } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/users/password";
import { endSession, startSession } from "@/lib/users/session";
import {
  audit,
  countUsers,
  createFirstAdmin,
  getUserForLogin,
  legacyPasswordHash,
  normalizeUsername,
  signUpWithCode,
  touchUser,
  usernameProblem,
} from "@/lib/users/store";

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const slow = () => new Promise((r) => setTimeout(r, 700));

/** Error plus what was typed (not passwords), so the form keeps its values after a failure. */
export type FormState = { error: string; values: Record<string, string> } | null;

const keep = (form: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const fail = (error: string): FormState => ({ error, values: keep(form, ["name", "username"]) });
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const pw = String(form.get("password") ?? "");

  // First run: create the admin account (it keeps all existing data).
  if ((await countUsers()) === 0) {
    const name = String(form.get("name") ?? "").trim();
    if (!name) return fail("Enter your name.");
    const uProblem = usernameProblem(username);
    if (uProblem) return fail(uProblem);
    const legacy = await legacyPasswordHash();
    let hash: string;
    if (legacy) {
      if (!(await verifyPassword(pw, legacy))) {
        await slow();
        return fail("That's not the password this app used before. Enter your existing password.");
      }
      hash = legacy;
    } else {
      const p = passwordProblem(pw);
      if (p) return fail(p);
      if (pw !== String(form.get("confirm") ?? "")) return fail("The two passwords don't match.");
      hash = await hashPassword(pw);
    }
    const user = await createFirstAdmin({ username, name, passwordHash: hash });
    await startSession(user);
    redirect("/admin");
  }

  const found = await getUserForLogin(username);
  if (!found || !(await verifyPassword(pw, found.hash))) {
    await slow();
    return fail("That username and password don't match. Try again.");
  }
  if (found.user.status !== "active") return fail("This account is paused. Ask the person who invited you.");
  await startSession(found.user);
  await touchUser(found.user.id, "last_login_at");
  await audit(null, found.user.id, "login", found.user.id);
  redirect(found.user.mustChangePassword ? "/account?reset=1" : safeNext(form.get("next")));
}

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const fail = (error: string): FormState => ({ error, values: keep(form, ["code", "name", "username"]) });
  const code = String(form.get("code") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const pw = String(form.get("password") ?? "");
  if (!code.trim()) return fail("Enter the signup code you were given.");
  if (!name) return fail("Enter your name.");
  if (name.length > 60) return fail("That name is too long.");
  const uProblem = usernameProblem(username);
  if (uProblem) return fail(uProblem);
  const pProblem = passwordProblem(pw);
  if (pProblem) return fail(pProblem);
  if (pw !== String(form.get("confirm") ?? "")) return fail("The two passwords don't match.");
  const r = await signUpWithCode({ code, username, name, password: pw });
  if (!r.ok) {
    await slow();
    return fail(r.error);
  }
  await getUserDb(r.user.schemaName); // create and fill the new learner's tables now
  await startSession(r.user);
  redirect("/plan");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
