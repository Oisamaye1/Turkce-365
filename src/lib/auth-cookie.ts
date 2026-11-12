/**
 * Signed session cookie (Web Crypto HMAC — works in middleware/Edge and Node).
 * Enabled only when AUTH_SECRET is set (the online deployment).
 */
export const SESSION_COOKIE = "t365_session";
export const SESSION_DAYS = 365;

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeSession(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${await hmac(secret, `t365:${exp}`)}`;
}

export async function verifySession(secret: string, value: string | undefined, now = Date.now()): Promise<boolean> {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < now) return false;
  const expected = await hmac(secret, `t365:${exp}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export const authEnabled = () => !!process.env.AUTH_SECRET;
