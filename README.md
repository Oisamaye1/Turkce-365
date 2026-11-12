# Türkçe 365 — personal Turkish tutor

A local-first web app that takes you from **absolute beginner (A0) to about A2–B1 in 12 months, at 20–25 minutes a day**.
You type and write Turkish all the time; there is no multiple choice. Mistakes keep coming back until you stop making them.

- **Next.js 15 (App Router) + TypeScript + Tailwind 4** with **Postgres**: Supabase online, or embedded PGlite (`data/pglite/`) locally. Both use the same SQL.
- **AI through the Claude Code CLI** (`claude -p`), so it runs on your **Claude Pro** login. No API key is needed.
- **Works offline.** Only lesson writing, writing correction and the weekly notes use Claude. If Claude is unreachable, a local fallback takes over.
- **Daily lesson at 05:30 Europe/Istanbul.** North Cyprus uses Turkey time (UTC+3 all year), so the app does **not** use Europe/Nicosia.

---

## Online (Vercel) — how it is wired

```
 phone / laptop browser ──► Vercel (Next.js)  ──► Supabase Postgres (schema "turkce")
                               ▲  password gate          ▲
                               │  06:00 backup cron      │ DATABASE_URL (.env.local)
                               │  (offline lesson)       │
                     your computer: npm run worker  every 15 min (claude -p, Pro login)
                       • 05:30 Istanbul → today's Claude lesson (+ desktop notification)
                       • upgrades an offline lesson to Claude if you haven't started it
                       • corrects writing you submitted online → error cards in today's reviews
                       • rewrites weekly-report notes with Claude
```

- **Vercel can't run `claude -p`**, because your Pro login lives on your computer. The online app therefore never calls Claude.
  - If no lesson exists by **06:00**, a Vercel Cron job creates the **offline lesson**.
  - Writing you submit online is **queued**. The worker on your computer corrects it within ~15 minutes while the computer is on.
- **Password gate.** On your first visit you choose a password, stored as a scrypt hash in the database. The session cookie lasts a year. The gate is active when `AUTH_SECRET` is set.
- **Vercel environment variables:**

  | Variable | Purpose |
  |---|---|
  | `DATABASE_URL` | Supabase pooler; role `turkce_app` can only use schema `turkce` |
  | `AUTH_SECRET` | signs the login cookie |
  | `CRON_SECRET` | authorises the cron call |
  | `TURKCE_DISABLE_CLAUDE=1` | the server never calls Claude |
- **Deploys:** every push to the production branch redeploys.

### Set up the worker on your computer (once)

```bash
git clone https://github.com/oisamaye1/turkce-365 && cd turkce-365 && git checkout claude/admiring-einstein-fgzx23
npm install
npx vercel link            # pick the "turkce-365" project
npx vercel env pull .env.local   # writes DATABASE_URL for the worker
npm run check:claude       # verifies claude -p works with your Pro login
npm run worker             # run once by hand
npm run scheduler:setup    # every 15 min (cron / Task Scheduler)
```

Settings → *Daily lesson job* shows when the worker last checked in.

## Local-only mode

Without `DATABASE_URL`, the app keeps everything in an embedded Postgres (PGlite) at `data/pglite/`. Claude runs in-process, and there is no password.

```bash
npm install
npm run check:claude
npm run build && npm start      # http://localhost:3000 (and your phone on the same Wi-Fi)
npm run scheduler:setup         # worker every 15 min; it hands work to the running app
```

## A day with the app (≈ 20–25 min)

| Step | Where | Time |
|---|---|---|
| Reviews: due cards plus 15 new words, typed English → Turkish | **Review · Tekrar** | ~5–10 min |
| Lesson: warm-up → dialogue → 5 new phrases → grammar + 8 drills → writing | **Lesson · Ders** | ~15–20 min |
| Extra suffix practice (optional) | **Suffix Gym · Ek Antrenmanı** | — |

- **Sunday:** the lesson is replaced by the **weekly check-in** (15 words, 10 suffix drills, 1 translation). It saves a progress report.
- **Monday:** a new **real-life mission** set in Northern Cyprus, with a phrase sheet, audio, Done / Struggled buttons and a reflection box.

## Modules

| Spec | Implementation |
|---|---|
| A — Alphabet & pronunciation | `/alphabet`: all 29 letters, with the ones that differ from English highlighted, a dotted/undotted i note, a vowel-harmony chart, and listen-and-spell. With no Turkish voice installed it switches to a "sound it out" mode. |
| B — Vocabulary SRS | `/review`: SM-2 with Again/Hard/Good/Easy. The grade is suggested from correctness and speed. TR → EN unlocks after 3 successful reviews. Leeches are flagged at ≥ 6 lapses. Uses the on-screen keyboard (ç ğ ı İ ö ş ü ⇧). |
| C — Suffix engine & drills | `src/lib/turkish/*` (pure TS, unit-tested) and `/gym`. Each step unlocks at 90 % over the last 20 drills. |
| D — Daily lesson | `src/lib/lesson/generate.ts` and `scripts/generate-lesson.ts`. Uses Claude → Zod, falls back to local content, sends a notification, and catches up on missed days. |
| E — Writing correction | `/write` and lesson step 5. Shows a word diff. Every error becomes a review card due **today**, plus a `mistakes` row tagged by rule. |
| F — Missions | `/missions`: 24 graded missions, then later rounds without the phrase sheet. Struggles feed into the lesson prompt. |
| G — Weekly check-in | Sunday quiz → report: words, retention, suffix accuracy per rule, top 3 mistakes, streak, focus areas. Viewable on `/progress` with Recharts charts. |

### Answer checking (`src/lib/turkish/answer.ts`)
- Turkish lower-casing everywhere: `I → ı`, `İ → i` (plus decomposed `İ`).
- **Missing Turkish letters count as "almost"** and as a soft fail: `cok` → *almost* (`çok`).
- One typo (Levenshtein 1) in a word of ≥ 6 letters counts as *almost*. Suffix drills turn typo tolerance off, because `kitapda` vs `kitapta` is a grammar error, not a typo.

### Suffix engine (`src/lib/turkish/`)
- **Harmony:** 2-way and 4-way vowel harmony.
- **Consonants:** d→t assimilation ("fıstıkçı şahap"). Softening only when a word is flagged `softens`; the app never guesses. Also nk→ng.
- **Buffers:** y / s / n, and the pronominal n after his/her/their (`evinde`).
- **Exceptions:** loanword harmony overrides (`saat → saate`), vowel drop (`şehir → şehri`), doubling (`hak → hakkı`), and `su → suyu` / `suyun`.
- **Copula:** with negative, question and past forms.
- **Verbs:** present continuous (`başla → başlıyor`, `git → gidiyor`, `de/ye → diyor/yiyor`), negative, past, future (`k → ğ`), aorist (stored per verb, with irregular negatives), and ability `-(y)Abil` / `-(y)AmAz`.
- **Stacking:** `evlerimden`, `kitaplarınızda`.
- **Reverse analyzer:** `src/lib/lesson/analyze.ts` runs the engine backwards, so tapping a word in a dialogue shows its breakdown even offline.

---

## Vocabulary (`data/`)

- `data/vocab-src/*.txt` is the source you edit by hand: **1,500 entries in 60 themed units of 25**, in frequency order, every one with an example sentence.
- `npm run vocab:build` checks every entry and writes `data/vocab.json` and `data/units.json`. It refuses to write if any of these fail:
  - every noun or adjective ending in p/ç/t/k has an explicit `s` (softens) or `ns` flag
  - every verb's stored aorist matches the aorist rule, including the 13 -Ir monosyllables and the et-compounds
  - there are no duplicates and no stray characters
- `npm run seed` syncs an edited `vocab.json` into an existing database. Your review history is kept.
- `data/dialogues.json` holds 14 pre-written Northern Cyprus dialogues for offline lessons.
- `data/missions.json` holds the 24 weekly missions.

## Scheduling

`npm run scheduler:setup` (add `-- --dry-run` to preview, `-- --remove` to uninstall):

- **macOS / Linux:** adds a block to your crontab.
  - 05:30 Istanbul is converted to the system timezone, because macOS cron ignores `CRON_TZ`. If your zone has DST, both possible times are scheduled.
  - It also adds an hourly catch-up run and an `@reboot` run.
  - All of these are safe to repeat: the script does nothing before 05:30 Istanbul or when today's lesson already exists.
- **Windows:** registers a Task Scheduler task (XML) with **"Run task as soon as possible after a scheduled start is missed"** and a logon trigger.
- **When the app is opened:** if there is no lesson for today and it is after 05:30, the Today page generates one (catch-up).
- **Logs:** each run writes to `logs/lesson.log` and the `job_runs` table. The last runs appear in **Settings**.

Manual runs: `npm run lesson -- --now` (before 05:30), `npm run lesson:force` (regenerate), `npm run lesson -- --offline`.

## Data model

Postgres tables (in schema `turkce`): `cards`, `reviews`, `review_log`, `grammar_progress`, `gym_log`, `lessons`, `writings`, `mistakes`, `missions`, `weekly_reports`, `settings`, `job_runs`. See `src/lib/db/schema.ts`.

**Backups:**
- **Settings → Export everything (.json)**
- or run `npm run backup`, which writes to `data/backups/`.
- Supabase also keeps its own daily backups of the database.

## Development

```bash
npm test            # Vitest: suffix engine, answer checking, SM-2, vocab validation, drills, DB integration (in-memory PGlite)
npm run typecheck
npm run dev
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | hosted Postgres; when unset, the local PGlite at `data/pglite/` (or `TURKCE_PGLITE_DIR`) is used |
| `CLAUDE_BIN` | path to the claude binary |
| `TURKCE_DISABLE_CLAUDE=1` | force offline mode |
| `TURKCE_KEEP_API_KEY=1` | let the CLI see `ANTHROPIC_API_KEY` |

### Acceptance criteria → where they are verified

| Criterion | Check |
|---|---|
| 05:30 lesson + notification, or catch-up on first open | `tests/integration.test.ts` (before / after 05:30, Istanbul date, idempotent), `scripts/generate-lesson.ts` (node-notifier), Today page catch-up |
| Suffix engine passes every spec example | `tests/suffix-engine.test.ts` (180+ cases, ≥ 5 per rule) |
| `cok` → "almost" | `tests/answer-and-srs.test.ts` |
| Turkish I/ı, İ/i casing | `trLower` / `trUpper`, used by every checker; tested |
| Corrected errors in today's queue | integration test "every corrected error becomes a review card due the same day" |
| Sunday quiz + saved report | integration tests (weekly quiz on Sunday, report saved) |
| Offline; Claude features fail gracefully | `TURKCE_DISABLE_CLAUDE` fallback tests; writing shows "saved — retry" |
| 20–25 min/day | 15 new cards/day (configurable), lesson sections timed 3+5+3+4+5 min |
