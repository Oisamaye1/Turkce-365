import { exportAllJson } from "@/lib/db/export";

export const dynamic = "force-dynamic";

export async function GET() {
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(await exportAllJson(), null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="turkce-365-${stamp}.json"`,
    },
  });
}
