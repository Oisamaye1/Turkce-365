/**
 * Accounts, one-time signup codes and the admin audit log (schema turkce_app).
 * Server-only. Every query names its schema explicitly and runs on the unscoped connection.
 */
import { randomBytes } from "node:crypto";
import { APP_SCHEMA, LEGACY_SCHEMA, getBaseDb, type DB } from "@/lib/db";
import { hashPassword } from "./password";
import type { AppUser, Role, SignupCode, UserStatus } from "./types";
import { normalizeUsername } from "./username";

const U = `${APP_SCHEMA}.users`;
const C = `${APP_SCHEMA}.signup_codes`;
const A = `${APP_SCHEMA}.audit_log`;

type UserRow = {
  id: number;
  username: string;
  name: string;
  password_hash: string;
  role: Role;
  status: UserStatus;
  ai_enabled: number;
  schema_name: string;
  session_version: number;
  must_change_password: number;
  invite_code_id: number | null;
  created_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
};

const toUser = (r: UserRow): AppUser => ({
  id: Number(r.id),
  username: r.username,
  name: r.name,
  role: r.role === "admin" ? "admin" : "user",
  status: r.status === "disabled" ? "disabled" : "active",
  aiEnabled: !!Number(r.ai_enabled),
  schemaName: r.schema_name,
  sessionVersion: Number(r.session_version),
  mustChangePassword: !!Number(r.must_change_password),
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
  lastSeenAt: r.last_seen_at,
  inviteCodeId: r.invite_code_id == null ? null : Number(r.invite_code_id),
});

export { normalizeUsername, usernameProblem } from "./username";

// ---------------------------------------------------------------- users

export async function countUsers(): Promise<number> {
  const db = await getBaseDb();
  const r = await db.one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${U}`);
  return Number(r?.n ?? 0);
}

export async function getUserById(id: number): Promise<AppUser | null> {
  const db = await getBaseDb();
  const r = await db.one<UserRow>(`SELECT * FROM ${U} WHERE id = ?`, [id]);
  return r ? toUser(r) : null;
}

export async function getUserForLogin(username: string): Promise<{ user: AppUser; hash: string } | null> {
  const db = await getBaseDb();
  const r = await db.one<UserRow>(`SELECT * FROM ${U} WHERE username = ?`, [normalizeUsername(username)]);
  return r ? { user: toUser(r), hash: r.password_hash } : null;
}

export async function getPasswordHash(id: number): Promise<string | null> {
  const db = await getBaseDb();
  const r = await db.one<{ password_hash: string }>(`SELECT password_hash FROM ${U} WHERE id = ?`, [id]);
  return r?.password_hash ?? null;
}

export async function listUsers(): Promise<AppUser[]> {
  const db = await getBaseDb();
  const rows = await db.all<UserRow>(`SELECT * FROM ${U} ORDER BY id`);
  return rows.map(toUser);
}

export async function activeUsers(): Promise<AppUser[]> {
  return (await listUsers()).filter((u) => u.status === "active");
}

/** Password hash from the single-user version of the app, if it was ever set. */
export async function legacyPasswordHash(): Promise<string | null> {
  const db = await getBaseDb();
  const r = await db.one<{ value: string }>(`SELECT value FROM ${LEGACY_SCHEMA}.settings WHERE key = 'auth_password_hash'`);
  return r?.value ?? null;
}

/** The very first account: an admin that owns the original data. */
export async function createFirstAdmin(input: { username: string; name: string; passwordHash: string }): Promise<AppUser> {
  const db = await getBaseDb();
  return db.tx(async (t) => {
    await t.run("SELECT pg_advisory_xact_lock(365361)");
    const n = await t.one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${U}`);
    if (Number(n?.n) > 0) throw new Error("The admin account already exists.");
    const r = await t.one<UserRow>(
      `INSERT INTO ${U} (username, name, password_hash, role, schema_name) VALUES (?, ?, ?, 'admin', ?) RETURNING *`,
      [normalizeUsername(input.username), input.name.trim(), input.passwordHash, LEGACY_SCHEMA],
    );
    const user = toUser(r!);
    await audit(t, user.id, "setup", user.id);
    return user;
  });
}

export type SignupResult = { ok: true; user: AppUser } | { ok: false; error: string };

/** Use a signup code (once) and create the account inside one transaction. */
export async function signUpWithCode(input: { code: string; username: string; name: string; password: string }): Promise<SignupResult> {
  const db = await getBaseDb();
  const code = normalizeCode(input.code);
  const username = normalizeUsername(input.username);
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.tx(async (t) => {
      const now = new Date().toISOString();
      // Claim the code first: the WHERE clause makes it single-use even under races.
      const claimed = await t.one<{ id: number; role: Role }>(
        `UPDATE ${C} SET used_at = ? WHERE code = ? AND used_at IS NULL AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?) RETURNING id, role`,
        [now, code, now],
      );
      if (!claimed) return { ok: false as const, error: "That code isn't valid. It may have been used already or expired." };
      const taken = await t.one(`SELECT 1 FROM ${U} WHERE username = ?`, [username]);
      if (taken) throw new SignupAbort("That username is taken. Try another.");
      const schema = `turkce_u_${randomBytes(6).toString("hex")}`;
      const r = await t.one<UserRow>(
        `INSERT INTO ${U} (username, name, password_hash, role, schema_name, invite_code_id, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        [username, input.name.trim(), passwordHash, claimed.role === "admin" ? "admin" : "user", schema, claimed.id, now],
      );
      const user = toUser(r!);
      await t.run(`UPDATE ${C} SET used_by = ? WHERE id = ?`, [user.id, claimed.id]);
      await audit(t, user.id, "signup", user.id, `Code ${code}`);
      return { ok: true as const, user };
    });
  } catch (e) {
    if (e instanceof SignupAbort) return { ok: false, error: e.message };
    throw e;
  }
}

class SignupAbort extends Error {}

export async function updateUser(
  id: number,
  patch: Partial<{ name: string; role: Role; status: UserStatus; aiEnabled: boolean; mustChangePassword: boolean; passwordHash: string; bumpSession: boolean }>,
) {
  const db = await getBaseDb();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) (sets.push("name = ?"), vals.push(patch.name.trim()));
  if (patch.role !== undefined) (sets.push("role = ?"), vals.push(patch.role));
  if (patch.status !== undefined) (sets.push("status = ?"), vals.push(patch.status));
  if (patch.aiEnabled !== undefined) (sets.push("ai_enabled = ?"), vals.push(patch.aiEnabled ? 1 : 0));
  if (patch.mustChangePassword !== undefined) (sets.push("must_change_password = ?"), vals.push(patch.mustChangePassword ? 1 : 0));
  if (patch.passwordHash !== undefined) (sets.push("password_hash = ?"), vals.push(patch.passwordHash));
  if (patch.bumpSession) sets.push("session_version = session_version + 1");
  if (!sets.length) return;
  await db.run(`UPDATE ${U} SET ${sets.join(", ")} WHERE id = ?`, [...vals, id]);
}

export async function touchUser(id: number, field: "last_seen_at" | "last_login_at") {
  const db = await getBaseDb();
  await db.run(`UPDATE ${U} SET ${field} = ? WHERE id = ?`, [new Date().toISOString(), id]);
}

export async function deleteUserRow(id: number) {
  const db = await getBaseDb();
  await db.run(`DELETE FROM ${U} WHERE id = ?`, [id]);
}

export async function countAdmins(): Promise<number> {
  const db = await getBaseDb();
  const r = await db.one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${U} WHERE role = 'admin' AND status = 'active'`);
  return Number(r?.n ?? 0);
}

// ---------------------------------------------------------------- signup codes

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

function randomCode(): string {
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Accept "abcd efgh", "ABCD-EFGH", "abcdefgh". */
export function normalizeCode(c: string): string {
  const s = c.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}

type CodeRow = {
  id: number;
  code: string;
  note: string | null;
  role: Role;
  created_by: number | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by: number | null;
  used_by_name?: string | null;
  revoked_at: string | null;
};

const toCode = (r: CodeRow): SignupCode => ({
  id: Number(r.id),
  code: r.code,
  note: r.note,
  role: r.role === "admin" ? "admin" : "user",
  createdBy: r.created_by == null ? null : Number(r.created_by),
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  usedAt: r.used_at,
  usedBy: r.used_by == null ? null : Number(r.used_by),
  usedByName: r.used_by_name ?? null,
  revokedAt: r.revoked_at,
});

export async function createCodes(input: { count: number; note: string | null; role: Role; expiresDays: number | null; createdBy: number }): Promise<SignupCode[]> {
  const db = await getBaseDb();
  const expires = input.expiresDays ? new Date(Date.now() + input.expiresDays * 86_400_000).toISOString() : null;
  const out: SignupCode[] = [];
  await db.tx(async (t) => {
    for (let i = 0; i < input.count; i++) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const r = await t.one<CodeRow>(
          `INSERT INTO ${C} (code, note, role, created_by, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (code) DO NOTHING RETURNING *`,
          [randomCode(), input.note, input.role, input.createdBy, expires],
        );
        if (r) {
          out.push(toCode(r));
          break;
        }
      }
    }
    await audit(t, input.createdBy, "codes.create", null, `${out.length} ${input.role} code(s)${input.note ? ` for “${input.note}”` : ""}`);
  });
  return out;
}

export async function listCodes(limit = 200): Promise<SignupCode[]> {
  const db = await getBaseDb();
  const rows = await db.all<CodeRow>(
    `SELECT c.*, u.name AS used_by_name FROM ${C} c LEFT JOIN ${U} u ON u.id = c.used_by ORDER BY c.id DESC LIMIT ?`,
    [limit],
  );
  return rows.map(toCode);
}

export async function revokeCode(id: number, actor: number) {
  const db = await getBaseDb();
  await db.run(`UPDATE ${C} SET revoked_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL`, [new Date().toISOString(), id]);
  await audit(db, actor, "codes.revoke", null, `Code #${id}`);
}

// ---------------------------------------------------------------- audit log

export interface AuditEntry {
  id: number;
  at: string;
  actorId: number | null;
  actorName: string | null;
  action: string;
  targetId: number | null;
  targetName: string | null;
  detail: string | null;
}

export async function audit(db: DB | null, actorId: number | null, action: string, targetId: number | null, detail?: string) {
  const d = db ?? (await getBaseDb());
  await d.run(`INSERT INTO ${A} (actor_id, action, target_id, detail) VALUES (?, ?, ?, ?)`, [actorId, action, targetId, detail ?? null]);
}

export async function listAudit(limit = 100, targetId?: number): Promise<AuditEntry[]> {
  const db = await getBaseDb();
  const rows = await db.all<{
    id: number;
    at: string;
    actor_id: number | null;
    actor_name: string | null;
    action: string;
    target_id: number | null;
    target_name: string | null;
    detail: string | null;
  }>(
    `SELECT a.*, ua.name AS actor_name, ut.name AS target_name
     FROM ${A} a LEFT JOIN ${U} ua ON ua.id = a.actor_id LEFT JOIN ${U} ut ON ut.id = a.target_id
     ${targetId ? "WHERE a.target_id = ? OR a.actor_id = ?" : ""}
     ORDER BY a.id DESC LIMIT ?`,
    targetId ? [targetId, targetId, limit] : [limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    at: r.at,
    actorId: r.actor_id == null ? null : Number(r.actor_id),
    actorName: r.actor_name,
    action: r.action,
    targetId: r.target_id == null ? null : Number(r.target_id),
    targetName: r.target_name,
    detail: r.detail,
  }));
}
