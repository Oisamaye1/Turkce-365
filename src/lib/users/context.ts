import { AsyncLocalStorage } from "node:async_hooks";
import type { AppUser } from "./types";

/**
 * Explicit "who is this for" context, for work that runs outside a browser request:
 * the worker on your computer, the daily cron, admin pages reading another user's data.
 */
const als = new AsyncLocalStorage<AppUser>();

export function runAsUser<T>(user: AppUser, fn: () => Promise<T>): Promise<T> {
  return als.run(user, fn);
}

export function contextUser(): AppUser | undefined {
  return als.getStore();
}
