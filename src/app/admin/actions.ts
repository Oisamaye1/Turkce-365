"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dropUserSchema } from "@/lib/db";
import { hashPassword, temporaryPassword } from "@/lib/users/password";
import { invalidateSessions, requireAdmin } from "@/lib/users/session";
import { audit, countAdmins, createCodes, deleteUserRow, getUserById, revokeCode, updateUser } from "@/lib/users/store";
import type { Role } from "@/lib/users/types";

type Result = { ok: true; message?: string } | { ok: false; error: string };

function done(message?: string): Result {
  invalidateSessions();
  revalidatePath("/admin", "layout");
  return { ok: true, message };
}

const CodesInput = z.object({
  count: z.number().int().min(1).max(25),
  note: z.string().trim().max(80).optional(),
  role: z.enum(["user", "admin"]),
  expiresDays: z.number().int().min(0).max(365),
});

export async function createCodesAction(input: z.input<typeof CodesInput>): Promise<{ ok: boolean; codes?: string[]; error?: string }> {
  const me = await requireAdmin();
  const p = CodesInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Choose between 1 and 25 codes." };
  const codes = await createCodes({
    count: p.data.count,
    note: p.data.note || null,
    role: p.data.role,
    expiresDays: p.data.expiresDays || null,
    createdBy: me.id,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, codes: codes.map((c) => c.code) };
}

export async function revokeCodeAction(id: number): Promise<Result> {
  const me = await requireAdmin();
  await revokeCode(id, me.id);
  return done("Code revoked.");
}

async function target(id: number) {
  const me = await requireAdmin();
  const user = await getUserById(id);
  if (!user) throw new Error("That account no longer exists.");
  return { me, user };
}

export async function setStatusAction(id: number, status: "active" | "disabled"): Promise<Result> {
  const { me, user } = await target(id);
  if (user.id === me.id) return { ok: false, error: "You can't pause your own account." };
  if (status === "disabled" && user.role === "admin" && (await countAdmins()) <= 1) return { ok: false, error: "Keep at least one active admin." };
  // Pausing also signs them out everywhere.
  await updateUser(id, { status, bumpSession: status === "disabled" });
  await audit(null, me.id, status === "disabled" ? "user.pause" : "user.resume", id);
  return done(status === "disabled" ? `${user.name} is paused and signed out.` : `${user.name} can sign in again.`);
}

export async function setRoleAction(id: number, role: Role): Promise<Result> {
  const { me, user } = await target(id);
  if (user.id === me.id) return { ok: false, error: "You can't change your own role." };
  await updateUser(id, { role });
  await audit(null, me.id, role === "admin" ? "user.promote" : "user.demote", id);
  return done(role === "admin" ? `${user.name} is now an admin.` : `${user.name} is now a learner.`);
}

export async function setAiAction(id: number, enabled: boolean): Promise<Result> {
  const { me, user } = await target(id);
  await updateUser(id, { aiEnabled: enabled });
  await audit(null, me.id, enabled ? "user.ai.on" : "user.ai.off", id);
  return done(enabled ? `Claude lessons and corrections are on for ${user.name}.` : `${user.name} now gets offline lessons only.`);
}

export async function resetPasswordAction(id: number): Promise<{ ok: boolean; password?: string; error?: string }> {
  const { me, user } = await target(id);
  if (user.id === me.id) return { ok: false, error: "Change your own password on the Account page." };
  const password = temporaryPassword();
  await updateUser(id, { passwordHash: await hashPassword(password), mustChangePassword: true, bumpSession: true });
  await audit(null, me.id, "user.password.reset", id);
  done();
  return { ok: true, password };
}

export async function signOutUserAction(id: number): Promise<Result> {
  const { me, user } = await target(id);
  await updateUser(id, { bumpSession: true });
  await audit(null, me.id, "user.signout", id);
  return done(`${user.name} is signed out on every device.`);
}

export async function deleteUserAction(id: number, confirmUsername: string): Promise<Result> {
  const { me, user } = await target(id);
  if (user.id === me.id) return { ok: false, error: "You can't delete your own account." };
  if (confirmUsername.trim().toLowerCase() !== user.username) return { ok: false, error: `Type ${user.username} to confirm.` };
  if (user.schemaName === "turkce") return { ok: false, error: "This account holds the original data and can't be deleted." };
  await dropUserSchema(user.schemaName);
  await deleteUserRow(id);
  await audit(null, me.id, "user.delete", null, `${user.name} (@${user.username})`);
  return done(`${user.name}'s account and all their data were deleted.`);
}
