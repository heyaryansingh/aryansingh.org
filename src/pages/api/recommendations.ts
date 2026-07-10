/**
 * /api/recommendations — visitors recommend things to read / watch / listen to.
 * Books, papers, films, blogs, journals, news, podcasts, anything. Same
 * moderation posture as the guestbook: honeypot, profanity filter, length
 * caps, salted-IP rate limit, owner hide/delete via MODERATION_KEY.
 */
import type { APIRoute } from "astro";
import { LIMITS, REC_KINDS } from "../../lib/interactive";
import { ok, fail, getEnv, hashIp, rateLimit, readBody, cleanStr, optName, isBot, checkClean } from "../../lib/api";

export const prerender = false;

const KINDS = REC_KINDS.map((k) => k.key) as readonly string[];

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const limit = Math.min(LIMITS.recsMax, Math.max(1, Number(ctx.url.searchParams.get("limit")) || 100));
  const { results } = await env.DB.prepare(
    "SELECT id, kind, title, author, url, note, name, created_at AS createdAt FROM recommendations " +
      "WHERE hidden = 0 ORDER BY created_at DESC LIMIT ?",
  )
    .bind(limit)
    .all();
  return ok({ recommendations: results });
};

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const body = await readBody(ctx);
  if (isBot(body)) return fail("Rejected.", 400);

  const kind = typeof body.kind === "string" && KINDS.includes(body.kind) ? body.kind : "other";

  const title = cleanStr(body.title, LIMITS.recTitle);
  if (!title) return fail(`A title is required (max ${LIMITS.recTitle} chars).`, 400);

  // Author / note / url are optional; validate what's present.
  const author = typeof body.author === "string" ? body.author.trim().slice(0, LIMITS.recAuthor) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, LIMITS.recNote) : "";
  let url = typeof body.url === "string" ? body.url.trim().slice(0, LIMITS.recUrl) : "";
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(url)) return fail("That link doesn't look valid.", 400);

  // Run the free-text fields through the language filter.
  for (const text of [title, author, note].filter(Boolean)) {
    const bad = checkClean(text);
    if (bad) return fail(bad, 400);
  }
  const name = optName(body.name, LIMITS.name);

  const ipHash = await hashIp(ctx, env);
  if (!(await rateLimit(env.DB, ipHash, "recommendation", 10, 10 * 60 * 1000)))
    return fail("Slow down — you've recommended a few already. Try again later.", 429);

  const now = Date.now();
  const res = await env.DB.prepare(
    "INSERT INTO recommendations (kind, title, author, url, note, name, created_at, ip_hash) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(kind, title, author, url, note, name, now, ipHash)
    .first<{ id: number }>();

  return ok(
    { recommendation: { id: res?.id, kind, title, author, url, note, name, createdAt: now } },
    201,
  );
};
