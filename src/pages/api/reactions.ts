import type { APIRoute } from "astro";
import { REACTION_EMOJIS, type ReactionCounts } from "../../lib/interactive";
import { ok, fail, getEnv, hashIp, rateLimit, readBody, cleanStr } from "../../lib/api";

export const prerender = false;

const TYPE_MAX = 24;
const SLUG_MAX = 120;

async function snapshot(
  db: D1Database,
  targetType: string,
  targetSlug: string,
  ipHash: string,
): Promise<{ counts: ReactionCounts; mine: string[] }> {
  const { results } = await db
    .prepare(
      "SELECT emoji, COUNT(*) AS n FROM reactions WHERE target_type = ? AND target_slug = ? GROUP BY emoji",
    )
    .bind(targetType, targetSlug)
    .all<{ emoji: string; n: number }>();
  const counts: ReactionCounts = {};
  for (const r of results) counts[r.emoji] = r.n;

  const mineRows = await db
    .prepare("SELECT emoji FROM reactions WHERE target_type = ? AND target_slug = ? AND ip_hash = ?")
    .bind(targetType, targetSlug, ipHash)
    .all<{ emoji: string }>();
  return { counts, mine: mineRows.results.map((r) => r.emoji) };
}

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const targetType = cleanStr(ctx.url.searchParams.get("targetType"), TYPE_MAX);
  const targetSlug = cleanStr(ctx.url.searchParams.get("targetSlug"), SLUG_MAX);
  if (!targetType || !targetSlug) return fail("targetType and targetSlug required.", 400);
  const ipHash = await hashIp(ctx, env);
  return ok(await snapshot(env.DB, targetType, targetSlug, ipHash));
};

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const body = await readBody(ctx);
  const targetType = cleanStr(body.targetType, TYPE_MAX);
  const targetSlug = cleanStr(body.targetSlug, SLUG_MAX);
  const emoji = String(body.emoji ?? "");
  if (!targetType || !targetSlug) return fail("targetType and targetSlug required.", 400);
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) return fail("Unknown reaction.", 400);

  const ipHash = await hashIp(ctx, env);
  if (!(await rateLimit(env.DB, ipHash, "reactions", 60, 10 * 60 * 1000)))
    return fail("Too many reactions. Take a breath.", 429);

  // Toggle: remove if present, else add.
  const existing = await env.DB.prepare(
    "SELECT id FROM reactions WHERE target_type = ? AND target_slug = ? AND emoji = ? AND ip_hash = ?",
  )
    .bind(targetType, targetSlug, emoji, ipHash)
    .first<{ id: number }>();

  let toggled: "added" | "removed";
  if (existing) {
    await env.DB.prepare("DELETE FROM reactions WHERE id = ?").bind(existing.id).run();
    toggled = "removed";
  } else {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO reactions (target_type, target_slug, emoji, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(targetType, targetSlug, emoji, ipHash, Date.now())
      .run();
    toggled = "added";
  }

  return ok({ ...(await snapshot(env.DB, targetType, targetSlug, ipHash)), toggled });
};
