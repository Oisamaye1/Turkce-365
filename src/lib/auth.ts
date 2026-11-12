import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getSetting, setSetting } from "@/lib/db/settings";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hasPassword(): Promise<boolean> {
  return !!(await getSetting("auth_password_hash"));
}

export async function setPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 32);
  await setSetting("auth_password_hash", `${salt.toString("hex")}:${hash.toString("hex")}`);
}

export async function checkPassword(pw: string): Promise<boolean> {
  const stored = await getSetting("auth_password_hash");
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  const hash = await scrypt(pw, Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}
