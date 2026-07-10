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

-- Game leaderboard: one row per submitted score. Highest per game shown.
CREATE TABLE IF NOT EXISTS leaderboard (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game       TEXT    NOT NULL,
  name       TEXT    NOT NULL DEFAULT 'anon',
  score      INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash    TEXT    NOT NULL,
  hidden     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_game ON leaderboard (game, score DESC);

-- Correspondence chess: visitors play White vs. the site owner (Black).
-- token = visitor's secret for moving in their own game; owner moves are
-- authorized by MODERATION_KEY. fen caches the current position; moves is a
-- space-separated SAN history for replay/display.
CREATE TABLE IF NOT EXISTS chess_games (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  token        TEXT    NOT NULL UNIQUE,
  visitor_name TEXT    NOT NULL DEFAULT 'anon',
  fen          TEXT    NOT NULL,
  moves        TEXT    NOT NULL DEFAULT '',
  turn         TEXT    NOT NULL DEFAULT 'w',
  status       TEXT    NOT NULL DEFAULT 'active',
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  ip_hash      TEXT    NOT NULL,
  hidden       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chess_updated ON chess_games (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chess_turn ON chess_games (status, turn);

-- Sliding-window rate limiter: one row per (ip_hash, action).
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash      TEXT    NOT NULL,
  action       TEXT    NOT NULL,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, action)
);
