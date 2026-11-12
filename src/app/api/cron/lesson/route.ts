import { ensureTodayLesson } from "@/lib/lesson/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron backup (06:00 Istanbul): if the worker on your computer hasn't created today's
 * lesson, make an offline one so a day is never lost. The worker upgrades it later if unstarted.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const res = await ensureTodayLesson({ trigger: "cron" });
  return Response.json(res);
}
