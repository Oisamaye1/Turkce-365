/**
 * Verifies the Claude Code CLI on this machine: which flags exist and whether a
 * headless JSON call works with your Pro login.
 *   npm run check:claude            # detect flags + one tiny test call
 *   npm run check:claude -- --no-call
 */
import { z } from "zod";
import { detectClaude, runClaudeJson } from "../src/lib/claude/cli";

async function main() {
  const caps = await detectClaude(true);
  console.log("Claude CLI:", caps.available ? `found (${caps.version ?? "unknown version"}) at "${caps.bin}"` : `NOT available — ${caps.error}`);
  if (!caps.available) {
    console.log("\nInstall Claude Code (https://docs.claude.com/claude-code) and run `claude` once to log in with your Pro account.");
    console.log("The app still works fully offline; AI features fall back to local content.");
    process.exit(1);
  }
  console.log("Supported flags:", caps.flags);
  if (process.argv.includes("--no-call")) return;
  console.log("\nTest call (uses your subscription, a few tokens)…");
  const res = await runClaudeJson(
    'Return ONLY this JSON with a correct Turkish translation filled in: {"tr": "<Turkish for: good morning>", "ok": true}',
    z.object({ tr: z.string(), ok: z.boolean() }),
    { jsonSchema: { type: "object", required: ["tr", "ok"], properties: { tr: { type: "string" }, ok: { type: "boolean" } } }, timeoutMs: 120_000 },
  );
  if (res.ok) console.log(`✓ Works (${res.ms} ms):`, res.data);
  else {
    console.log("✗ Call failed:", res.error);
    process.exit(1);
  }
}
main();
