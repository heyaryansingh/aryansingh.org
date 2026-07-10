import type { APIRoute } from "astro";
import { ok, fail, getEnv, readBody } from "../../lib/api";

export const prerender = false;

const TABLES = new Set(["guestbook", "stickers", "comments", "recommendations"]);
const ACTIONS = new Set(["hide", "unhide", "delete"]);

/**
 * Owner-only moderation. Requires the MODERATION_KEY secret.
 * Body: { key, table, id, action }.
 */
export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const key = env.MODERATION_KEY;
  if (!key) return fail("Moderation is not configured.", 503);

  const body = await readBody(ctx);
  if (body.key !== key) return fail("Unauthorized.", 401);

  const table = String(body.table ?? "");
  const action = String(body.action ?? "");
  const id = Number(body.id);
  if (!TABLES.has(table)) return fail("Unknown table.", 400);
  if (!ACTIONS.has(action)) return fail("Unknown action.", 400);
  if (!Number.isInteger(id) || id < 1) return fail("Invalid id.", 400);

  // Table name is validated against an allowlist above — safe to interpolate.
  if (action === "delete") {
    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  } else {
    const hidden = action === "hide" ? 1 : 0;
    await env.DB.prepare(`UPDATE ${table} SET hidden = ? WHERE id = ?`).bind(hidden, id).run();
  }
  return ok({ table, id, action });
};
