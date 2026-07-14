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
  num,
  isBot,
  checkClean,
} from "../../lib/api";

export const prerender = false;

const TYPE_MAX = 24;
const SLUG_MAX = 120;

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const targetType = cleanStr(ctx.url.searchParams.get("targetType"), TYPE_MAX);
  const targetSlug = cleanStr(ctx.url.searchParams.get("targetSlug"), SLUG_MAX);
  if (!targetType || !targetSlug) return fail("targetType and targetSlug required.", 400);

  const { results } = await env.DB.prepare(
    "SELECT id, name, body, parent_id AS parentId, created_at AS createdAt FROM comments " +
      "WHERE hidden = 0 AND target_type = ? AND target_slug = ? ORDER BY created_at ASC LIMIT ?",
  )
    .bind(targetType, targetSlug, LIMITS.commentsMax)
    .all();
  return ok({ comments: results });
};

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const raw = await readBody(ctx);
  if (isBot(raw)) return fail("Rejected.", 400);

  const targetType = cleanStr(raw.targetType, TYPE_MAX);
  const targetSlug = cleanStr(raw.targetSlug, SLUG_MAX);
  if (!targetType || !targetSlug) return fail("targetType and targetSlug required.", 400);

  const text = cleanStr(raw.body, LIMITS.comment);
  if (!text) return fail(`Comment required (max ${LIMITS.comment} chars).`, 400);
  const bad = checkClean(text);
  if (bad) return fail(bad, 400);
  const name = optName(raw.name, LIMITS.name);
  const parentId = raw.parentId == null ? null : num(raw.parentId, 1, Number.MAX_SAFE_INTEGER, 0) || null;

  const ipHash = await hashIp(ctx, env);
  if (!(await rateLimit(env.DB, ipHash, "comments", 8, 10 * 60 * 1000)))
    return fail("You're commenting quickly. Try again in a bit.", 429);

  const now = Date.now();
  const res = await env.DB.prepare(
    "INSERT INTO comments (target_type, target_slug, name, body, parent_id, created_at, ip_hash) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(targetType, targetSlug, name, text, parentId, now, ipHash)
    .first<{ id: number }>();

  return ok({ comment: { id: res?.id, name, body: text, parentId, createdAt: now } }, 201);
};
