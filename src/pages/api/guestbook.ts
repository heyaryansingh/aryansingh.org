import type { APIRoute } from "astro";
import { LIMITS } from "../../lib/interactive";
import {
  ok,
  fail,
  getEnv,
  hashIp,
  rateLimit,
  readBody,
  cleanStr,
  optName,
  isBot,
  checkClean,
} from "../../lib/api";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const limit = Math.min(LIMITS.guestbookMax, Math.max(1, Number(ctx.url.searchParams.get("limit")) || 50));
  const { results } = await env.DB.prepare(
    "SELECT id, name, message, created_at AS createdAt FROM guestbook WHERE hidden = 0 ORDER BY created_at DESC LIMIT ?",
  )
    .bind(limit)
    .all();
  return ok({ entries: results });
};

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const body = await readBody(ctx);
  if (isBot(body)) return fail("Rejected.", 400);

  const message = cleanStr(body.message, LIMITS.message);
  if (!message) return fail(`Message required (max ${LIMITS.message} chars).`, 400);
  const bad = checkClean(message);
  if (bad) return fail(bad, 400);
  const name = optName(body.name, LIMITS.name);

  const ipHash = await hashIp(ctx, env);
  if (!(await rateLimit(env.DB, ipHash, "guestbook", 5, 10 * 60 * 1000)))
    return fail("Slow down — you've posted a few times already. Try again later.", 429);

  const now = Date.now();
  const res = await env.DB.prepare(
    "INSERT INTO guestbook (name, message, created_at, ip_hash) VALUES (?, ?, ?, ?) RETURNING id",
  )
    .bind(name, message, now, ipHash)
    .first<{ id: number }>();

  return ok({ entry: { id: res?.id, name, message, createdAt: now } }, 201);
};
