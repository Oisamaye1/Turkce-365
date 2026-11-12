/**
 * Installs the daily 05:30 (Europe/Istanbul) lesson job for this OS.
 *
 *   npm run scheduler:setup              # install / update
 *   npm run scheduler:setup -- --dry-run # just print what would be installed
 *   npm run scheduler:setup -- --remove  # uninstall
 *
 * Installs the WORKER (scripts/worker.ts) every 15 minutes — it creates the lesson after 05:30
 * and processes corrections queued from the online app.
 * macOS / Linux → user crontab. The time is converted from Europe/Istanbul to the
 *   system timezone (cron on macOS ignores CRON_TZ). If the system zone has DST, both
 *   possible times are scheduled; the script itself refuses to run before 05:30
 *   Istanbul time and is idempotent, so it never generates twice. Hourly catch-up
 *   runs and an @reboot run cover a machine that was asleep at 05:30.
 * Windows → Task Scheduler task with "Run task as soon as possible after a scheduled
 *   start is missed" (StartWhenAvailable) + a logon trigger.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const MARK_BEGIN = "# >>> turkce-365 >>>";
const MARK_END = "# <<< turkce-365 <<<";
const TASK_NAME = "Turkce365DailyLesson";
const TARGET_TZ = "Europe/Istanbul";
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const remove = args.has("--remove");

async function readSetting(key: string, fallback: string): Promise<string> {
  try {
    // Lazy import so --dry-run works even when the database is unreachable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./env").loadEnv();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSetting } = require("../src/lib/db/settings");
    return (await Promise.race([getSetting(key), new Promise((r) => setTimeout(() => r(null), 20_000))])) ?? fallback;
  } catch {
    return fallback;
  }
}

function offsetMinutes(tz: string, at: Date): number {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** System-local times that correspond to `hhmm` in the target zone, across the year. */
export function localTimesFor(hhmm: string, targetTz = TARGET_TZ, systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone): { h: number; m: number }[] {
  const [h, m] = hhmm.split(":").map(Number);
  const year = new Date().getUTCFullYear();
  const samples = [0, 3, 6, 9].map((mo) => new Date(Date.UTC(year, mo, 15, 12)));
  const set = new Map<string, { h: number; m: number }>();
  for (const at of samples) {
    const diff = offsetMinutes(systemTz, at) - offsetMinutes(targetTz, at);
    let total = h * 60 + m + diff;
    total = ((total % 1440) + 1440) % 1440;
    const t = { h: Math.floor(total / 60), m: total % 60 };
    set.set(`${t.h}:${t.m}`, t);
  }
  return [...set.values()];
}

function which(cmd: string): string | null {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() || null : null;
}

function commandLine(): string {
  const node = process.execPath;
  const tsx = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const claude = which("claude");
  const env = claude ? `CLAUDE_BIN='${claude}' PATH='${path.dirname(claude)}:${path.dirname(node)}:/usr/local/bin:/usr/bin:/bin' ` : "";
  return `cd '${ROOT}' && ${env}'${node}' '${tsx}' scripts/worker.ts >> '${path.join(ROOT, "logs", "worker.log")}' 2>&1`;
}

function setupCron(lessonTime: string) {
  const sysTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const times = localTimesFor(lessonTime);
  const cmd = commandLine();
  const lines = [
    MARK_BEGIN,
    `# Türkçe 365 worker — every 15 min: lesson at ${lessonTime} ${TARGET_TZ} (system timezone: ${sysTz}),`,
    `# writing corrections queued from the online app, weekly-report notes. Idempotent.`,
    ...times.filter((t) => t.m % 15 !== 0).map((t) => `${t.m} ${t.h} * * * ${cmd}`),
    `*/15 * * * * ${cmd}`,
    `@reboot sleep 90 && ${cmd}`,
    MARK_END,
  ];
  const current = (() => {
    try {
      return execFileSync("crontab", ["-l"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      return "";
    }
  })();
  const stripped = current.replace(new RegExp(`${MARK_BEGIN}[\\s\\S]*?${MARK_END}\\n?`, "g"), "").trimEnd();
  const next = remove ? `${stripped}\n` : `${stripped ? stripped + "\n\n" : ""}${lines.join("\n")}\n`;
  if (dryRun) {
    console.log(remove ? "Would remove the Türkçe 365 block from your crontab." : `Would install into your crontab:\n\n${lines.join("\n")}\n`);
    return;
  }
  const r = spawnSync("crontab", ["-"], { input: next, encoding: "utf8" });
  if (r.status !== 0) {
    console.error("crontab failed:", r.stderr || r.error);
    console.error("\nAdd these lines manually with `crontab -e`:\n\n" + lines.join("\n"));
    process.exit(1);
  }
  console.log(remove ? "✓ Removed the Türkçe 365 cron jobs." : `✓ Installed cron jobs:\n\n${lines.join("\n")}\n`);
  if (process.platform === "darwin" && !remove) {
    console.log("macOS note: if the job doesn't run, give /usr/sbin/cron Full Disk Access (System Settings → Privacy & Security).");
  }
}

function setupWindows(lessonTime: string) {
  const [t] = localTimesFor(lessonTime);
  const hh = String(t.h).padStart(2, "0");
  const mm = String(t.m).padStart(2, "0");
  const node = process.execPath;
  const tsx = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const xml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Türkçe 365 — generate today's Turkish lesson at ${lessonTime} (${TARGET_TZ})</Description></RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2024-01-01T${hh}:${mm}:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>
      <Repetition><Interval>PT15M</Interval><Duration>P1D</Duration><StopAtDurationEnd>false</StopAtDurationEnd></Repetition>
    </CalendarTrigger>
    <LogonTrigger><Enabled>true</Enabled><Delay>PT2M</Delay></LogonTrigger>
  </Triggers>
  <Settings>
    <StartWhenAvailable>true</StartWhenAvailable>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <ExecutionTimeLimit>PT30M</ExecutionTimeLimit>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>cmd.exe</Command>
      <Arguments>/c cd /d "${ROOT}" &amp;&amp; "${node}" "${tsx}" scripts\\worker.ts &gt;&gt; logs\\worker.log 2&gt;&amp;1</Arguments>
      <WorkingDirectory>${ROOT}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;
  if (dryRun) {
    console.log(remove ? `Would run: schtasks /Delete /TN ${TASK_NAME} /F` : `Would register task ${TASK_NAME} (local time ${hh}:${mm}):\n\n${xml}`);
    return;
  }
  if (remove) {
    const r = spawnSync("schtasks", ["/Delete", "/TN", TASK_NAME, "/F"], { encoding: "utf8" });
    console.log(r.status === 0 ? "✓ Removed scheduled task." : r.stderr);
    return;
  }
  const file = path.join(os.tmpdir(), "turkce365-task.xml");
  fs.writeFileSync(file, "﻿" + xml, { encoding: "utf16le" });
  const r = spawnSync("schtasks", ["/Create", "/TN", TASK_NAME, "/XML", file, "/F"], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error("schtasks failed:", r.stderr || r.error);
    process.exit(1);
  }
  console.log(`✓ Registered Task Scheduler task "${TASK_NAME}": every 15 min from ${hh}:${mm} local time (= ${lessonTime} ${TARGET_TZ}),`);
  console.log("  with 'run as soon as possible after a missed start' and a run at logon.");
  if (t.h !== 5 || t.m !== 30) console.log("  Tip: set Windows to the 'Istanbul' time zone (UTC+03:00) so the clock matches North Cyprus time.");
}

async function main() {
  fs.mkdirSync(path.join(ROOT, "logs"), { recursive: true });
  const lessonTime = await readSetting("lesson_time", "05:30");
  console.log(`Platform: ${process.platform} · system timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone} · lesson time: ${lessonTime} ${TARGET_TZ}`);
  if (process.platform === "win32") setupWindows(lessonTime);
  else setupCron(lessonTime);
}

if (process.argv[1] && process.argv[1].endsWith("setup-scheduler.ts")) main().then(() => process.exit(0));
