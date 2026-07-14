import type { APIRoute } from "astro";
import { LIMITS, STICKER_KINDS } from "../../lib/interactive";
import { ok, fail, getEnv, hashIp, rateLimit, readBody, num, isBot } from "../../lib/api";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const { results } = await env.DB.prepare(
    "SELECT id, kind, x, y, rotation, scale, created_at AS createdAt FROM stickers WHERE hidden = 0 ORDER BY created_at DESC LIMIT ?",
  )
    .bind(LIMITS.stickersMax)
    .all();
  return ok({ stickers: results });
};

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const body = await readBody(ctx);
  if (isBot(body)) return fail("Rejected.", 400);

  const kind = String(body.kind ?? "");
  if (!(STICKER_KINDS as readonly string[]).includes(kind)) return fail("Unknown sticker.", 400);

  const x = num(body.x, 0, 1, 0.5);
  const y = num(body.y, 0, 1, 0.5);
  const rotation = num(body.rotation, -180, 180, 0);
  const scale = num(body.scale, 0.5, 2, 1);

  const ipHash = await hashIp(ctx, env);
  if (!(await rateLimit(env.DB, ipHash, "stickers", 20, 10 * 60 * 1000)))
    return fail("You've placed a lot of stickers. Give it a minute.", 429);

  const now = Date.now();
  const res = await env.DB.prepare(
    "INSERT INTO stickers (kind, x, y, rotation, scale, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(kind, x, y, rotation, scale, now, ipHash)
    .first<{ id: number }>();

  return ok({ sticker: { id: res?.id, kind, x, y, rotation, scale, createdAt: now } }, 201);
};
