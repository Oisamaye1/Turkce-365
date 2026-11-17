/**
 * Who is using the app right now. Server-only.
 *   1. an explicit context (runAsUser): worker, cron, admin pages reading a learner's data;
 *   2. otherwise the signed session cookie of the current request.
 * The cookie's signature is checked by the middleware; here we also check that the account
 * still exists, is active, and hasn't been signed out everywhere (session version).
 */
import { SESSION_COOKIE, SESSION_DAYS, authSecret, makeSession, readSession } from "@/lib/auth-cookie";
import { contextUser } from "./context";
import { getUserById, touchUser } from "./store";
import type { AppUser } from "./types";

const TTL_MS = 10_000;
// Process-wide (Next.js may load this module more than once on the server).
const g = globalThis as unknown as { __t365Sessions?: Map<string, { at: number; user: AppUser | null }>; __t365Touch?: Map<number, number> };
const cache = (g.__t365Sessions ??= new Map());
const lastTouch = (g.__t365Touch ??= new Map());

async function readCookie(): Promise<{ inRequest: boolean; value?: string }> {
  try {
    const { cookies } = await import("next/headers");
    return { inRequest: true, value: (await cookies()).get(SESSION_COOKIE)?.value };
  } catch {
    return { inRequest: false }; // not inside a request (scripts, tests)
  }
}

/** True inside a web request (page, action, route), false in scripts and tests. */
export async function inRequest(): Promise<boolean> {
  return (await readCookie()).inRequest;
}

/** The account behind the current request's cookie, if valid. */
export async function sessionUser(): Promise<AppUser | null> {
  const { value } = await readCookie();
  if (!value) return null;
  const hit = cache.get(value);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.user;
  const claims = await readSession(authSecret(), value);
  let user: AppUser | null = null;
  if (claims) {
    const u = await getUserById(claims.userId);
    if (u && u.status === "active" && u.sessionVersion === claims.version) user = u;
  }
  if (cache.size > 500) cache.clear();
  cache.set(value, { at: Date.now(), user });
  if (user && Date.now() - (lastTouch.get(user.id) ?? 0) > 5 * 60_000) {
    lastTouch.set(user.id, Date.now());
    touchUser(user.id, "last_seen_at").catch(() => {});
  }
  return user;
}

export async function currentUser(): Promise<AppUser | null> {
  return contextUser() ?? (await sessionUser());
}

export async function requireUser(): Promise<AppUser> {
  const u = await currentUser();
  if (!u) throw new Error("Please sign in again.");
  return u;
}

export async function requireAdmin(): Promise<AppUser> {
  const u = await sessionUser();
  if (!u || u.role !== "admin") throw new Error("Only an admin can do that.");
  return u;
}

/** Forget cached lookups (after an admin changes an account). */
export function invalidateSessions() {
  cache.clear();
}

export async function startSession(user: AppUser) {
  const { cookies } = await import("next/headers");
  (await cookies()).set(SESSION_COOKIE, await makeSession(authSecret(), user.id, user.sessionVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !!process.env.VERCEL,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  invalidateSessions();
}

export async function endSession() {
  const { cookies } = await import("next/headers");
  (await cookies()).delete(SESSION_COOKIE);
}
