export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Vocabulary & generated cards. seq keeps frequency order for new-card introduction.
CREATE TABLE IF NOT EXISTS cards (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  tr               TEXT NOT NULL,
  en               TEXT NOT NULL,
  pos              TEXT NOT NULL,
  unit             INTEGER NOT NULL DEFAULT 0,
  exTr             TEXT,
  exEn             TEXT,
  note             TEXT,
  softens          INTEGER,
  harmonyOverride  TEXT,
  stem             TEXT,
  aorist           TEXT,
  flags            TEXT,              -- JSON: dropsVowel, doubles, yBuffer, compound, noDrill, irregular
  source           TEXT NOT NULL DEFAULT 'seed',   -- seed | lesson | correction
  seq              INTEGER NOT NULL DEFAULT 0,
  leech            INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cards_source_seq ON cards(source, seq);
CREATE INDEX IF NOT EXISTS idx_cards_tr ON cards(tr);

-- SRS state per card & direction (en-tr = type Turkish, tr-en = type English).
CREATE TABLE IF NOT EXISTS reviews (
  card_id        INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  direction      TEXT NOT NULL,
  ease           REAL NOT NULL DEFAULT 2.5,
  interval       REAL NOT NULL DEFAULT 0,
  repetitions    INTEGER NOT NULL DEFAULT 0,
  due_date       TEXT NOT NULL,         -- ISO timestamp (UTC)
  lapses         INTEGER NOT NULL DEFAULT 0,
  last_reviewed  TEXT,
  introduced_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (card_id, direction)
);
CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews(due_date);

CREATE TABLE IF NOT EXISTS review_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id       INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL DEFAULT 'en-tr',
  timestamp     TEXT NOT NULL,
  answer_given  TEXT,
  result        TEXT NOT NULL,          -- correct | almost | wrong
  ms_taken      INTEGER,
  grade         TEXT,
  context       TEXT NOT NULL DEFAULT 'review'   -- review | warmup | quiz
);
CREATE INDEX IF NOT EXISTS idx_review_log_ts ON review_log(timestamp);

CREATE TABLE IF NOT EXISTS grammar_progress (
  step_id      INTEGER PRIMARY KEY,
  unlocked_at  TEXT,
  attempts     INTEGER NOT NULL DEFAULT 0,
  correct      INTEGER NOT NULL DEFAULT 0,
  mastery      REAL NOT NULL DEFAULT 0
);

-- Every suffix drill answer (Suffix Gym, lesson spotlight, weekly quiz).
CREATE TABLE IF NOT EXISTS gym_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id       INTEGER NOT NULL,
  timestamp     TEXT NOT NULL,
  result        TEXT NOT NULL,
  answer_given  TEXT,
  expected      TEXT,
  prompt        TEXT,
  rules         TEXT,
  context       TEXT NOT NULL DEFAULT 'gym'
);
CREATE INDEX IF NOT EXISTS idx_gym_log_step ON gym_log(step_id, timestamp);

CREATE TABLE IF NOT EXISTS lessons (
  date          TEXT PRIMARY KEY,       -- YYYY-MM-DD (Europe/Istanbul)
  kind          TEXT NOT NULL DEFAULT 'daily',   -- daily | weekly
  source        TEXT NOT NULL DEFAULT 'fallback', -- claude | fallback
  json          TEXT NOT NULL,
  progress      TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT
);

CREATE TABLE IF NOT EXISTS writings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL,
  prompt          TEXT NOT NULL,
  my_text         TEXT NOT NULL,
  corrected_json  TEXT,
  score           REAL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mistakes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT NOT NULL,
  rule_tag     TEXT NOT NULL,
  original     TEXT NOT NULL,
  correction   TEXT NOT NULL,
  explanation  TEXT,
  source       TEXT NOT NULL DEFAULT 'writing',  -- writing | mission | quiz
  card_id      INTEGER REFERENCES cards(id) ON DELETE SET NULL,
  resolved     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mistakes_date ON mistakes(date);

CREATE TABLE IF NOT EXISTS missions (
  week          TEXT PRIMARY KEY,       -- Monday of the week (YYYY-MM-DD)
  learner_week  INTEGER NOT NULL,
  mission_json  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',  -- active | done | struggled
  reflection    TEXT,
  updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  week        TEXT PRIMARY KEY,         -- Monday of the reported week
  json        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kind         TEXT NOT NULL,
  trigger      TEXT NOT NULL DEFAULT 'scheduler',  -- scheduler | catch-up | manual
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  status       TEXT NOT NULL DEFAULT 'running',     -- running | ok | fallback | error | skipped
  message      TEXT
);
`;
