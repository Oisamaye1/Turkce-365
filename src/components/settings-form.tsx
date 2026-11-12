"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkClaudeAction, regenerateTodayAction, saveSettingsAction, unlockStepAction } from "@/app/actions";
import { logoutAction } from "@/app/login/actions";
import type { JobRun } from "@/lib/db/jobs";
import type { Settings } from "@/lib/db/settings";
import { useSpeech } from "./speech";
import { Badge } from "./ui";

type ClaudeCheck = Awaited<ReturnType<typeof checkClaudeAction>>;

export function SettingsForm({
  settings,
  jobs,
  dbFile,
  online,
  workerSeen,
  platform,
  currentStep,
  steps,
}: {
  settings: Settings;
  jobs: JobRun[];
  dbFile: string;
  online: boolean;
  workerSeen: string | null;
  platform: string;
  currentStep: number;
  steps: { id: number; title: string }[];
}) {
  const router = useRouter();
  const { voices, voice, setVoiceURI, speak } = useSpeech();
  const [form, setForm] = useState({
    newCardsPerDay: settings.newCardsPerDay,
    lessonTime: settings.lessonTime,
    timezone: settings.timezone,
    claudeModel: settings.claudeModel ?? "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [check, setCheck] = useState<ClaudeCheck | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [unlockTo, setUnlockTo] = useState(currentStep);

  const save = async () => {
    setBusy("save");
    const r = await saveSettingsAction({ ...form, voiceURI: voice?.voiceURI });
    setMsg(r.ok ? "Saved" : r.error ?? "Error");
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <section className="card space-y-5">
        <h2 className="font-display text-xl font-extrabold">
          Learning <span className="ml-1 text-base font-normal text-muted" lang="tr">Öğrenme</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="font-medium">New words per day</span>
            <input type="number" min={0} max={100} className="input" value={form.newCardsPerDay} onChange={(e) => setForm({ ...form, newCardsPerDay: Number(e.target.value) })} />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Lesson time</span>
            <input type="time" className="input" value={form.lessonTime} onChange={(e) => setForm({ ...form, lessonTime: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Time zone</span>
            <input className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            <span className="text-xs text-muted">Northern Cyprus = Europe/Istanbul (UTC+3, no DST). Not Europe/Nicosia.</span>
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Claude model (optional)</span>
            <input className="input" placeholder="default — e.g. sonnet" value={form.claudeModel} onChange={(e) => setForm({ ...form, claudeModel: e.target.value })} />
            <span className="text-xs text-muted">Passed to claude -p --model. Leave empty for your CLI default.</span>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={busy === "save"}>
            Save settings
          </button>
          {msg ? <span className="font-medium">{msg}</span> : null}
        </div>
        <p className="text-xs text-muted">After changing the lesson time, run <code>npm run scheduler:setup</code> again.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-extrabold">
          Voice <span className="ml-1 text-base font-normal text-muted" lang="tr">Ses</span>
        </h2>
        {voices.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <select className="input !w-auto !text-base" value={voice?.voiceURI} onChange={(e) => setVoiceURI(e.target.value)}>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <button className="btn-ghost" onClick={() => speak("Merhaba! Türkçe öğreniyorum. Çok güzel, teşekkür ederim.")}>
              ▶ Test voice
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No Turkish (tr-TR) voice found in this browser, so speaker buttons are hidden. Install one: macOS → System Settings → Accessibility → Spoken Content → System voice → Manage voices → Turkish; Windows → Settings → Time &amp; language → Speech → Add voices → Türkçe; Android/iOS: add Turkish text-to-speech. Then reload.
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-extrabold">
          Claude <span className="ml-1 text-base font-normal text-muted" lang="tr">Yapay zeka</span>
        </h2>
        <p className="text-sm text-muted">AI features run through the Claude Code CLI (<code>claude -p</code>) with your Pro login — no API key. Everything else works offline.</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-ghost"
            disabled={!!busy}
            onClick={async () => {
              setBusy("detect");
              setCheck(await checkClaudeAction(false));
              setBusy(null);
            }}
          >
            Detect CLI
          </button>
          <button
            className="btn-ghost"
            disabled={!!busy}
            onClick={async () => {
              setBusy("test");
              setCheck(await checkClaudeAction(true));
              setBusy(null);
            }}
          >
            {busy === "test" ? "Testing…" : "Test a real call"}
          </button>
        </div>
        {check ? (
          <div className="rounded-xl bg-card-2 p-3 text-sm">
            {check.caps.available ? (
              <>
                <div>
                  <Badge tone="good">found</Badge> {check.caps.version} at <code>{check.caps.bin}</code>
                </div>
                <div className="mt-1 text-xs text-muted">
                  flags:{" "}
                  {Object.entries(check.caps.flags)
                    .map(([k, v]) => `${k} ${v ? "✓" : "✗"}`)
                    .join(", ")}
                </div>
              </>
            ) : (
              <div>
                <Badge tone="bad">not available</Badge> {check.caps.error}
              </div>
            )}
            {check.test ? (
              <div className="mt-2">
                {check.test.ok ? "✓" : "✗"} {check.test.text} ({Math.round(check.test.ms / 100) / 10}s)
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-extrabold">
          Daily lesson <span className="ml-1 text-base font-normal text-muted" lang="tr">Günlük ders</span>
        </h2>
        {online ? (
          <div className="space-y-2 text-sm">
            <p>
              Lessons are written by the <b>worker on your computer</b> at {settings.lessonTime} {settings.timezone} (it runs every 15 min and also
              corrects writing you submit here). If the computer is off, a backup cron creates an offline lesson at 06:00 and the worker upgrades it
              later if you haven&apos;t started it.
            </p>
            <p>
              Worker last seen:{" "}
              {workerSeen ? (
                <b>{new Date(workerSeen).toLocaleString("en-GB", { timeZone: settings.timezone })}</b>
              ) : (
                <Badge tone="warn">never — set it up on your computer</Badge>
              )}
            </p>
            <pre className="overflow-x-auto rounded-xl bg-card-2 p-3 text-xs">{`npx vercel env pull .env.local   # gets DATABASE_URL
npm run worker                   # test once
npm run scheduler:setup          # every 15 minutes`}</pre>
          </div>
        ) : (
          <>
            <p className="text-sm">
              Scheduled at <b>{settings.lessonTime}</b> {settings.timezone}. Install the scheduler on this computer ({platform}):
            </p>
            <pre className="overflow-x-auto rounded-xl bg-card-2 p-3 text-sm">npm run scheduler:setup</pre>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {(online ? (["offline"] as const) : (["claude", "offline"] as const)).map((k) => (
            <button
              key={k}
              className="btn-ghost"
              disabled={!!busy}
              onClick={async () => {
                if (!confirm("Replace today's lesson with a new one? Progress in it will be reset.")) return;
                setBusy(k);
                const r = await regenerateTodayAction(k === "claude");
                setMsg(r.message);
                setBusy(null);
                router.refresh();
              }}
            >
              {busy === k ? "Generating…" : k === "claude" ? "Regenerate today's lesson (Claude)" : "Regenerate offline"}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3">Started</th>
                <th className="pr-3">Trigger</th>
                <th className="pr-3">Status</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t border-border align-top">
                  <td className="py-1 pr-3 whitespace-nowrap">{new Date(j.startedAt).toLocaleString("en-GB", { timeZone: settings.timezone })}</td>
                  <td className="pr-3">{j.trigger}</td>
                  <td className="pr-3">
                    <Badge tone={j.status === "ok" ? "good" : j.status === "fallback" ? "warn" : j.status === "error" ? "bad" : "neutral"}>{j.status}</Badge>
                  </td>
                  <td className="text-xs text-muted">{j.message}</td>
                </tr>
              ))}
              {!jobs.length ? (
                <tr>
                  <td colSpan={4} className="py-2 text-muted">
                    No runs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-extrabold">
          Grammar level <span className="ml-1 text-base font-normal text-muted" lang="tr">Seviye</span>
        </h2>
        <p className="text-sm text-muted">Already know some grammar? Unlock steps up to:</p>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto !text-base" value={unlockTo} onChange={(e) => setUnlockTo(Number(e.target.value))}>
            {steps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.title}
              </option>
            ))}
          </select>
          <button
            className="btn-ghost"
            onClick={async () => {
              await unlockStepAction(unlockTo);
              setMsg(`Unlocked steps 1–${unlockTo}`);
              router.refresh();
            }}
          >
            Unlock
          </button>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-extrabold">
          Backup <span className="ml-1 text-base font-normal text-muted" lang="tr">Yedekleme</span>
        </h2>
        <p className="text-sm text-muted">
          Database: <code className="break-all">{dbFile}</code>
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="btn-ghost" href="/api/export/json">
            ⬇ Export everything (.json)
          </a>
        </div>
        <p className="text-xs text-muted">
          Or from a terminal: <code>npm run backup</code> (writes a JSON export to data/backups/).
        </p>
      </section>
      {online ? (
        <section className="card flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold">
            Account <span className="ml-1 text-base font-normal text-muted" lang="tr">Hesap</span>
          </h2>
          <form action={logoutAction}>
            <button className="btn-ghost">Log out</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
