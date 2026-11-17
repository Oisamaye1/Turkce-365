export type Role = "admin" | "user";
export type UserStatus = "active" | "disabled";

export interface AppUser {
  id: number;
  username: string;
  name: string;
  role: Role;
  status: UserStatus;
  aiEnabled: boolean;
  /** Postgres schema holding this learner's data. */
  schemaName: string;
  sessionVersion: number;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  inviteCodeId: number | null;
}

export interface SignupCode {
  id: number;
  code: string;
  note: string | null;
  role: Role;
  createdBy: number | null;
  createdAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedBy: number | null;
  usedByName?: string | null;
  revokedAt: string | null;
}

export type CodeState = "open" | "used" | "expired" | "revoked";

export function codeState(c: SignupCode, now = new Date().toISOString()): CodeState {
  if (c.usedAt) return "used";
  if (c.revokedAt) return "revoked";
  if (c.expiresAt && c.expiresAt <= now) return "expired";
  return "open";
}
