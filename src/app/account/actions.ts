"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/users/password";
import { endSession, requireUser, startSession } from "@/lib/users/session";
import { audit, getPasswordHash, getUserById, updateUser } from "@/lib/users/store";

export async function updateNameAction(_: string | null, form: FormData): Promise<string | null> {
  const me = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  if (!name || name.length > 60) return "Enter a name of up to 60 characters.";
  await updateUser(me.id, { name });
  revalidatePath("/", "layout");
  return "Saved.";
}

export async function changePasswordAction(_: string | null, form: FormData): Promise<string | null> {
  const me = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  if (!(await verifyPassword(current, await getPasswordHash(me.id)))) {
    await new Promise((r) => setTimeout(r, 600));
    return "Your current password isn't right.";
  }
  const p = passwordProblem(next);
  if (p) return p;
  if (next !== String(form.get("confirm") ?? "")) return "The two new passwords don't match.";
  if (next === current) return "Choose a password different from the current one.";
  // New password signs out every other device; this one gets a fresh session.
  await updateUser(me.id, { passwordHash: await hashPassword(next), mustChangePassword: false, bumpSession: true });
  await audit(null, me.id, "password.change", me.id);
  const fresh = await getUserById(me.id);
  if (fresh) await startSession(fresh);
  redirect("/account?changed=1");
}

export async function signOutEverywhereAction() {
  const me = await requireUser();
  await updateUser(me.id, { bumpSession: true });
  await audit(null, me.id, "signout.all", me.id);
  await endSession();
  redirect("/login");
}
