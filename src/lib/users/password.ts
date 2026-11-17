import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** scrypt hash stored as "saltHex:hashHex". */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  const hash = await scrypt(pw, Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (pw.length > 200) return "That password is too long.";
  return null;
}

/** Readable temporary password for admin resets, e.g. "kedi-7341-deniz". */
export function temporaryPassword(): string {
  const words = ["kedi", "deniz", "elma", "güneş", "kitap", "çay", "zeytin", "limon", "bulut", "yıldız", "simit", "nar"];
  const pick = () => words[randomBytes(1)[0] % words.length].normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
  const n = (randomBytes(2).readUInt16BE(0) % 9000) + 1000;
  return `${pick()}-${n}-${pick()}`;
}
