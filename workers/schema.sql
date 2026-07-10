-- D1 schema for aryansingh.org interactive layer.
-- Apply:  wrangler d1 execute aryansingh_interactive --local  --file ./workers/schema.sql
--         wrangler d1 execute aryansingh_interactive --remote --file ./workers/schema.sql

CREATE TABLE IF NOT EXISTS guestbook (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL DEFAULT 'anon',
  message    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash    TEXT    NOT NULL,
  hidden     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_guestbook_created ON guestbook (created_at DESC);

CREATE TABLE IF NOT EXISTS stickers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT    NOT NULL,
  x          REAL    NOT NULL,   -- 0..1 normalized
  y          REAL    NOT NULL,   -- 0..1 normalized
  rotation   REAL    NOT NULL DEFAULT 0,
  scale      REAL    NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  ip_hash    TEXT    NOT NULL,
  hidden     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_stickers_created ON stickers (created_at DESC);

CREATE TABLE IF NOT EXISTS reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT    NOT NULL,
  target_slug TEXT    NOT NULL,
  emoji       TEXT    NOT NULL,
  ip_hash     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  UNIQUE (target_type, target_slug, emoji, ip_hash)
);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions (target_type, target_slug);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT    NOT NULL,
  target_slug TEXT    NOT NULL,
  name        TEXT    NOT NULL DEFAULT 'anon',
  body        TEXT    NOT NULL,
  parent_id   INTEGER,
  created_at  INTEGER NOT NULL,
  ip_hash     TEXT    NOT NULL,
  hidden      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments (target_type, target_slug, created_at);

-- Sliding-window rate limiter: one row per (ip_hash, action).
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash      TEXT    NOT NULL,
  action       TEXT    NOT NULL,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, action)
);
