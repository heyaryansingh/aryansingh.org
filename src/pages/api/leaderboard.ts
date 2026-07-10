import type { APIRoute } from "astro";
import { LIMITS, LEADERBOARD_GAMES } from "../../lib/interactive";
import {
  ok,
  fail,
  getEnv,
  hashIp,
  rateLimit,
  readBody,
  optName,
  isBot,
  checkClean,
} from "../../lib/api";

export const prerender = false;

const isGame = (v: unknown): v is (typeof LEADERBOARD_GAMES)[number] =>
  typeof v === "string" && (LEADERBOARD_GAMES as readonly string[]).includes(v);

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const game = ctx.url.searchParams.get("game");
  if (!isGame(game)) return fail("Unknown game.", 400);
  const limit = Math.min(LIMITS.scoresMax, Math.max(1, Number(ctx.url.searchParams.get("limit")) || 10));
  const { results } = await env.DB.prepare(
    "SELECT id, name, score, created_at AS createdAt FROM leaderboard " +
      "WHERE game = ? AND hidden = 0 ORDER BY score DESC, created_at ASC LIMIT ?",
  )
    .bind(game, limit)
    .all();
  return ok({ scores: results });
};

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const body = await readBody(ctx);
  if (isBot(body)) return fail("Rejected.", 400);

  if (!isGame(body.game)) return fail("Unknown game.", 400);
  const game = body.game;

  const raw = typeof body.score === "number" ? body.score : Number(body.score);
  if (!Number.isFinite(raw)) return fail("Invalid score.", 400);
  const score = Math.floor(raw);
  if (score < 0 || score > LIMITS.scoreCap) return fail("Score out of range.", 400);

  const name = optName(body.name, LIMITS.name);
  const bad = checkClean(name);
  if (bad) return fail(bad, 400);

  const ipHash = await hashIp(ctx, env);
  if (!(await rateLimit(env.DB, ipHash, "leaderboard", 30, 10 * 60 * 1000)))
    return fail("Slow down — too many scores submitted. Try again later.", 429);

  const now = Date.now();
  const res = await env.DB.prepare(
    "INSERT INTO leaderboard (game, name, score, created_at, ip_hash) VALUES (?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(game, name, score, now, ipHash)
    .first<{ id: number }>();

  const rankRow = await env.DB.prepare(
    "SELECT COUNT(*) AS ahead FROM leaderboard WHERE game = ? AND hidden = 0 AND score > ?",
  )
    .bind(game, score)
    .first<{ ahead: number }>();
  const rank = rankRow ? rankRow.ahead + 1 : null;

  return ok({ entry: { id: res?.id, name, score, createdAt: now }, rank }, 201);
};
