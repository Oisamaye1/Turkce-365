/**
 * Scheduled job: creates today's lesson (05:30 Europe/Istanbul) and sends a desktop notification.
 *
 *   npx tsx scripts/generate-lesson.ts            # scheduler run (no-op before lesson time or if it exists)
 *   npx tsx scripts/generate-lesson.ts --now      # generate now even if it's before 05:30
 *   npx tsx scripts/generate-lesson.ts --force    # regenerate today's lesson
 *   npx tsx scripts/generate-lesson.ts --offline  # skip Claude, use local content
 */
import path from "node:path";
import { ensureTodayLesson } from "../src/lib/lesson/generate";
import { notifyDesktop } from "../src/lib/notify";

process.chdir(path.resolve(__dirname, ".."));

async function main() {
  const args = new Set(process.argv.slice(2));
  const stamp = new Date().toISOString();
  const res = await ensureTodayLesson({
    trigger: args.has("--manual") || args.has("--now") || args.has("--force") ? "manual" : "scheduler",
    force: args.has("--force"),
    ignoreTime: args.has("--now") || args.has("--force"),
    useClaude: !args.has("--offline"),
  });
  console.log(`[${stamp}] ${res.status.toUpperCase()} ${res.date}${res.kind ? ` (${res.kind}, ${res.source})` : ""}: ${res.message}`);
  if (res.status === "created" && !args.has("--quiet")) {
    const body =
      res.kind === "weekly"
        ? "Haftalık değerlendirme hazır! (Your weekly check-in is ready)"
        : "Bugünkü dersin hazır! (Today's lesson is ready)";
    await notifyDesktop("Türkçe 365", body);
  }
  process.exit(res.status === "error" ? 1 : 0);
}

main().catch((e) => {
  console.error(`[${new Date().toISOString()}] FATAL`, e);
  process.exit(1);
});
