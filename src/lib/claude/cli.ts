/**
 * Runs the Claude Code CLI in headless mode (`claude -p`) so AI features use the
 * learner's Claude Pro subscription — no API key.
 *
 * Verified flags (Claude Code 2.x):  -p, --output-format json, --json-schema,
 * --tools "", --no-session-persistence, --model. Flags are detected from
 * `claude --help` at runtime so older CLIs still work (they just skip the
 * unsupported ones). Every result is validated with Zod by the caller.
 */
import { spawn } from "node:child_process";
import os from "node:os";
import type { ZodType, ZodTypeDef } from "zod";

export interface ClaudeCapabilities {
  available: boolean;
  bin: string;
  version: string | null;
  flags: { outputFormat: boolean; jsonSchema: boolean; tools: boolean; noSessionPersistence: boolean; model: boolean };
  error?: string;
}

export type ClaudeJsonResult<T> =
  | { ok: true; data: T; ms: number; attempts: number }
  | { ok: false; error: string; ms: number; raw?: string };

const isWin = process.platform === "win32";

export function claudeBin(): string {
  return process.env.CLAUDE_BIN || "claude";
}

/** Environment for the child: drop ANTHROPIC_API_KEY so the CLI uses the Pro subscription login. */
function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (!process.env.TURKCE_KEEP_API_KEY) delete env.ANTHROPIC_API_KEY;
  return env;
}

function run(args: string[], input: string | null, timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let child;
    try {
      child = spawn(claudeBin(), args, { cwd: os.tmpdir(), env: childEnv(), shell: isWin, windowsHide: true });
    } catch (e) {
      resolve({ code: -1, stdout: "", stderr: String(e), timedOut: false });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + String(e), timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    if (input !== null) child.stdin.end(input);
    else child.stdin.end();
  });
}

let capsCache: { at: number; caps: ClaudeCapabilities } | null = null;

/** Detect whether the CLI exists and which flags it supports (cached for 10 minutes). */
export async function detectClaude(force = false): Promise<ClaudeCapabilities> {
  if (!force && capsCache && Date.now() - capsCache.at < 600_000) return capsCache.caps;
  const bin = claudeBin();
  const none = { outputFormat: false, jsonSchema: false, tools: false, noSessionPersistence: false, model: false };
  const help = await run(["--help"], null, 20_000);
  let caps: ClaudeCapabilities;
  if (help.code !== 0 && !help.stdout) {
    caps = { available: false, bin, version: null, flags: none, error: (help.stderr || "claude CLI not found").trim().slice(0, 300) };
  } else {
    const h = help.stdout + help.stderr;
    const ver = await run(["--version"], null, 15_000);
    caps = {
      available: true,
      bin,
      version: ver.stdout.trim() || null,
      flags: {
        outputFormat: h.includes("--output-format"),
        jsonSchema: h.includes("--json-schema"),
        tools: /--tools\s/.test(h),
        noSessionPersistence: h.includes("--no-session-persistence"),
        model: h.includes("--model"),
      },
    };
  }
  capsCache = { at: Date.now(), caps };
  return caps;
}

/** Pull the first JSON object out of a model reply (handles ```json fences and chatter). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(body.slice(start, end + 1));
}

export interface RunJsonOptions {
  /** JSON Schema passed to --json-schema when the CLI supports it. */
  jsonSchema?: object;
  timeoutMs?: number;
  model?: string | null;
  /** Retries after a validation failure (the errors are fed back to the model). */
  retries?: number;
}

/** Ask Claude for JSON and validate it with Zod. Never throws. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runClaudeJson<T>(prompt: string, schema: ZodType<T, ZodTypeDef, any>, opts: RunJsonOptions = {}): Promise<ClaudeJsonResult<T>> {
  const started = Date.now();
  if (process.env.TURKCE_DISABLE_CLAUDE === "1") return { ok: false, error: "Claude features disabled (TURKCE_DISABLE_CLAUDE=1)", ms: 0 };
  const caps = await detectClaude();
  if (!caps.available) return { ok: false, error: `Claude CLI unavailable: ${caps.error ?? "not found"}`, ms: Date.now() - started };

  const args = ["-p"];
  if (caps.flags.outputFormat) args.push("--output-format", "json");
  if (caps.flags.tools) args.push("--tools", isWin ? '""' : "");
  if (caps.flags.noSessionPersistence) args.push("--no-session-persistence");
  if (opts.model && caps.flags.model) args.push("--model", opts.model);
  if (opts.jsonSchema && caps.flags.jsonSchema) {
    const s = JSON.stringify(opts.jsonSchema);
    args.push("--json-schema", isWin ? `"${s.replace(/"/g, '\\"')}"` : s);
  }

  const retries = opts.retries ?? 1;
  let currentPrompt = prompt;
  let lastRaw = "";
  let lastError = "";
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const res = await run(args, currentPrompt, opts.timeoutMs ?? 240_000);
    lastRaw = res.stdout.slice(0, 4000);
    if (res.timedOut) return { ok: false, error: "Claude CLI timed out", ms: Date.now() - started, raw: lastRaw };
    if (res.code !== 0 && !res.stdout.trim()) {
      return { ok: false, error: `claude exited with ${res.code}: ${res.stderr.trim().slice(0, 300)}`, ms: Date.now() - started };
    }
    let candidate: unknown;
    try {
      if (caps.flags.outputFormat) {
        const outer = JSON.parse(res.stdout) as { is_error?: boolean; result?: string; structured_output?: unknown; subtype?: string };
        if (outer.is_error) {
          return { ok: false, error: `Claude returned an error: ${String(outer.result ?? outer.subtype).slice(0, 300)}`, ms: Date.now() - started };
        }
        candidate = outer.structured_output ?? extractJson(outer.result ?? "");
      } else {
        candidate = extractJson(res.stdout);
      }
    } catch (e) {
      lastError = `could not parse JSON: ${(e as Error).message}`;
      currentPrompt = `${prompt}\n\nYour previous reply was not valid JSON (${lastError}). Reply with ONLY the JSON object.`;
      continue;
    }
    const parsed = schema.safeParse(candidate);
    if (parsed.success) return { ok: true, data: parsed.data, ms: Date.now() - started, attempts: attempt };
    lastError = parsed.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    currentPrompt = `${prompt}\n\nYour previous JSON failed validation: ${lastError}\nFix these problems and reply with ONLY the corrected JSON object.`;
  }
  return { ok: false, error: `invalid JSON from Claude: ${lastError}`, ms: Date.now() - started, raw: lastRaw };
}
