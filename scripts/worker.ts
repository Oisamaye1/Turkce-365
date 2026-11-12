/**
 * The AI helper — run on YOUR computer (where `claude` is logged in with your Pro plan).
 * The scheduler runs it every 15 minutes:
 *   - creates today's Claude lesson after 05:30 Europe/Istanbul (desktop notification)
 *   - upgrades an offline lesson the online app made while the computer was off
 *   - corrects writing you submitted on your phone → error cards land in today's reviews
 *   - rewrites weekly-report notes with Claude
 *
 * It talks to the same database as the online app via DATABASE_URL in .env.local
 * (get it with `npx vercel env pull .env.local`).
 *
 * Local-only mode (no DATABASE_URL): if the local app is running, the work is handed to it
 * (the embedded database can only be opened by one process); otherwise the worker opens it itself.
 */
import path from "node:path";
import { loadEnv } from "./env";

process.chdir(path.resolve(__dirname, ".."));
loadEnv();

async function main() {
  const stamp = () => `[${new Date().toISOString()}]`;
  const quiet = process.argv.includes("--quiet");
  if (!process.env.DATABASE_URL) {
    try {
      const res = await fetch(`http://localhost:${process.env.PORT ?? 3000}/api/worker`, { method: "POST", signal: AbortSignal.timeout(600_000) });
      if (res.ok) {
        console.log(stamp(), "local app ran the worker:", await res.text());
        process.exit(0);
      }
    } catch {
      // App not running → safe to open the embedded database directly.
    }
  }
  const { runWorker } = await import("../src/lib/worker");
  const { notifyDesktop } = await import("../src/lib/notify");
  const s = await runWorker((m) => console.log(stamp(), m));
  if (!quiet && s.lesson?.status === "created") {
    await notifyDesktop(
      "Türkçe 365",
      s.lesson.kind === "weekly" ? "Haftalık değerlendirme hazır! (Your weekly check-in is ready)" : "Bugünkü dersin hazır! (Today's lesson is ready)",
    );
  }
  if (!quiet && s.corrected) await notifyDesktop("Türkçe 365", `${s.corrected} writing correction(s) ready — check Write · Yaz`);
  process.exit(0);
}

main().catch((e) => {
  console.error(new Date().toISOString(), "FATAL", e);
  process.exit(1);
});
