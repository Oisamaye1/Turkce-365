import { runWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Local-only mode: lets `npm run worker` hand its work to the running app (one PGlite owner). */
export async function POST(req: Request) {
  const host = new URL(req.url).hostname;
  if (process.env.VERCEL || process.env.DATABASE_URL || !["localhost", "127.0.0.1", "::1"].includes(host)) {
    return new Response("not available", { status: 404 });
  }
  const lines: string[] = [];
  const s = await runWorker((m) => lines.push(m));
  return new Response(`${lines.join("\n")}\n${JSON.stringify({ corrected: s.corrected, lesson: s.lesson?.status })}`);
}
