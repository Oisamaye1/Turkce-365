import { ensureTodayLesson } from "@/lib/lesson/generate";
import { runAsUser } from "@/lib/users/context";
import { activeUsers } from "@/lib/users/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vercel Cron backup: for every active learner whose lesson the worker hasn't created yet,
 * make an offline one so a day is never lost. The worker upgrades it later if unstarted.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const users = await activeUsers();
  if (!users.length) return Response.json([await ensureTodayLesson({ trigger: "cron" })]);
  const out = [];
  for (const u of users) {
    const r = await runAsUser(u, () => ensureTodayLesson({ trigger: "cron", useClaude: false })).catch((e) => ({ status: "error", message: String(e) }));
    out.push({ user: u.id, status: r.status });
  }
  return Response.json(out);
}
