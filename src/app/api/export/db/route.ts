import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Download a consistent copy of the SQLite database. */
export async function GET() {
  const tmp = path.join(os.tmpdir(), `turkce-backup-${Date.now()}.db`);
  await getDb().backup(tmp);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Disposition": `attachment; filename="turkce-365-${stamp}.db"`,
    },
  });
}
