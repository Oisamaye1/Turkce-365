/**
 * Signed session cookie (Web Crypto HMAC — works in middleware/Edge and Node).
 * Value: "<userId>.<sessionVersion>.<expiresMs>.<signature>". The middleware only checks the
 * signature; the server also checks that the user is active and the version is current
 * (bumping the version signs a user out everywhere).
 */
export const SESSION_COOKIE = "t365_session";
export const SESSION_DAYS = 365;

const enc = new TextEncoder();

/** AUTH_SECRET on the server; a fixed fallback only for local, non-Vercel runs. */
export function authSecret(): string {
  return process.env.AUTH_SECRET || (process.env.VERCEL ? "" : "turkce-365-local-only-secret");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeSession(secret: string, userId: number, version: number, now = Date.now()): Promise<string> {
  const exp = now + SESSION_DAYS * 86_400_000;
  const body = `${userId}.${version}.${exp}`;
  return `${body}.${await hmac(secret, `t365:${body}`)}`;
}

export interface SessionClaims {
  userId: number;
  version: number;
  exp: number;
}

export async function readSession(secret: string, value: string | undefined, now = Date.now()): Promise<SessionClaims | null> {
  if (!secret || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [uid, ver, exp, sig] = parts;
  if (!/^\d+$/.test(uid) || !/^\d+$/.test(ver) || !/^\d+$/.test(exp) || Number(exp) < now) return null;
  const expected = await hmac(secret, `t365:${uid}.${ver}.${exp}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? { userId: Number(uid), version: Number(ver), exp: Number(exp) } : null;
}
