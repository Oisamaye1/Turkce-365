import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Connectivity check (no personal data). */
export async function GET() {
  try {
    const db = await getDb();
    const r = await db.one<{ n: number }>("SELECT COUNT(*)::int AS n FROM cards WHERE source = 'seed'");
    return Response.json({ ok: true, driver: db.kind, seedCards: Number(r?.n ?? 0) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message.replace(/postgres(ql)?:\/\/[^\s]+/g, "<url>") : String(e) }, { status: 500 });
  }
}
