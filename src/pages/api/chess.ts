/**
 * /api/chess — correspondence chess vs. the site owner.
 *
 * Visitors play White; the owner replies as Black. Every move is validated
 * server-side with chess.js against the stored position, so no illegal state
 * can be written regardless of what the client sends.
 *
 * GET  /api/chess              → recent games (public arena)
 * GET  /api/chess?id=N         → one game (spectate/poll)
 * GET  /api/chess?pending=1    → count + ids of games waiting on the owner
 *                                (poll this from n8n/cron to get notified)
 * POST { action:"create", name }                → new game + visitor token
 * POST { action:"move", id, token, from, to }   → visitor (White) move
 * POST { action:"ownerMove", id, key, from, to }→ owner (Black) move, key = MODERATION_KEY
 */
import type { APIRoute } from "astro";
import { Chess } from "chess.js";
import { LIMITS } from "../../lib/interactive";
import { ok, fail, getEnv, hashIp, rateLimit, readBody, optName, isBot, checkClean, cleanStr } from "../../lib/api";

export const prerender = false;

const GAME_COLS =
  "id, visitor_name AS visitorName, fen, moves, turn, status, created_at AS createdAt, updated_at AS updatedAt";

function statusOf(g: Chess): string {
  if (g.isCheckmate()) return g.turn() === "w" ? "black wins" : "white wins";
  if (g.isStalemate() || g.isDraw() || g.isThreefoldRepetition() || g.isInsufficientMaterial()) return "draw";
  return "active";
}

/** Apply one move to a stored game row; returns the updated fields or an error string. */
function applyMove(
  fen: string,
  movesSan: string,
  from: unknown,
  to: unknown,
  promotion: unknown,
): { fen: string; moves: string; turn: string; status: string; san: string } | string {
  const f = cleanStr(from, 2);
  const t = cleanStr(to, 2);
  if (!f || !t || !/^[a-h][1-8]$/.test(f) || !/^[a-h][1-8]$/.test(t)) return "Bad move coordinates.";
  const promo = typeof promotion === "string" && /^[qrbn]$/.test(promotion) ? promotion : undefined;

  const g = new Chess(fen);
  let mv;
  try {
    mv = g.move({ from: f, to: t, promotion: promo ?? "q" });
  } catch {
    return "Illegal move.";
  }
  if (!mv) return "Illegal move.";
  return {
    fen: g.fen(),
    moves: movesSan ? `${movesSan} ${mv.san}` : mv.san,
    turn: g.turn(),
    status: statusOf(g),
    san: mv.san,
  };
}

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);

  if (ctx.url.searchParams.get("pending")) {
    const { results } = await env.DB.prepare(
      "SELECT id, visitor_name AS visitorName, updated_at AS updatedAt FROM chess_games " +
        "WHERE hidden = 0 AND status = 'active' AND turn = 'b' ORDER BY updated_at ASC",
    ).all();
    return ok({ pending: results.length, games: results });
  }

  const id = ctx.url.searchParams.get("id");
  if (id) {
    const game = await env.DB.prepare(`SELECT ${GAME_COLS} FROM chess_games WHERE id = ? AND hidden = 0`)
      .bind(Number(id))
      .first();
    if (!game) return fail("Game not found.", 404);
    return ok({ game });
  }

  const { results } = await env.DB.prepare(
    `SELECT ${GAME_COLS} FROM chess_games WHERE hidden = 0 ORDER BY updated_at DESC LIMIT 30`,
  ).all();
  return ok({ games: results });
};

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  const body = await readBody(ctx);
  if (isBot(body)) return fail("Rejected.", 400);
  const ipHash = await hashIp(ctx, env);
  const now = Date.now();

  if (body.action === "create") {
    const name = optName(body.name, LIMITS.name);
    const bad = checkClean(name);
    if (bad) return fail(bad, 400);
    if (!(await rateLimit(env.DB, ipHash, "chess-create", 3, 60 * 60 * 1000)))
      return fail("You've started a few games already — finish one first.", 429);

    const token = crypto.randomUUID();
    const fen = new Chess().fen();
    const res = await env.DB.prepare(
      "INSERT INTO chess_games (token, visitor_name, fen, created_at, updated_at, ip_hash) " +
        "VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
    )
      .bind(token, name, fen, now, now, ipHash)
      .first<{ id: number }>();
    return ok(
      { game: { id: res?.id, visitorName: name, fen, moves: "", turn: "w", status: "active", createdAt: now, updatedAt: now }, token },
      201,
    );
  }

  if (body.action === "move" || body.action === "ownerMove") {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return fail("Bad game id.", 400);
    const row = await env.DB.prepare(
      "SELECT token, fen, moves, turn, status FROM chess_games WHERE id = ? AND hidden = 0",
    )
      .bind(id)
      .first<{ token: string; fen: string; moves: string; turn: string; status: string }>();
    if (!row) return fail("Game not found.", 404);
    if (row.status !== "active") return fail("Game is over.", 409);

    if (body.action === "move") {
      if (typeof body.token !== "string" || body.token !== row.token)
        return fail("This isn't your game.", 403);
      if (row.turn !== "w") return fail("Not your turn — waiting on Aryan.", 409);
      if (!(await rateLimit(env.DB, ipHash, "chess-move", 60, 10 * 60 * 1000)))
        return fail("Slow down.", 429);
    } else {
      const key = env.MODERATION_KEY;
      if (!key || typeof body.key !== "string" || body.key !== key)
        return fail("Unauthorized.", 401);
      if (row.turn !== "b") return fail("It's the visitor's turn.", 409);
    }

    const applied = applyMove(row.fen, row.moves, body.from, body.to, body.promotion);
    if (typeof applied === "string") return fail(applied, 400);

    // Conditional on the fen we validated against: if a concurrent move landed
    // first, 0 rows change and we 409 instead of silently overwriting it.
    const res = await env.DB.prepare(
      "UPDATE chess_games SET fen = ?, moves = ?, turn = ?, status = ?, updated_at = ? WHERE id = ? AND fen = ?",
    )
      .bind(applied.fen, applied.moves, applied.turn, applied.status, now, id, row.fen)
      .run();
    if (!res.meta.changes) return fail("Position changed underneath you — reload and try again.", 409);

    return ok({
      game: { id, fen: applied.fen, moves: applied.moves, turn: applied.turn, status: applied.status, updatedAt: now },
      san: applied.san,
    });
  }

  if (body.action === "resign") {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return fail("Bad game id.", 400);
    const row = await env.DB.prepare(
      "SELECT token, status FROM chess_games WHERE id = ? AND hidden = 0",
    )
      .bind(id)
      .first<{ token: string; status: string }>();
    if (!row) return fail("Game not found.", 404);
    if (row.status !== "active") return fail("Game is over.", 409);

    let status: string;
    if (typeof body.token === "string" && body.token === row.token) status = "white resigned";
    else if (env.MODERATION_KEY && typeof body.key === "string" && body.key === env.MODERATION_KEY)
      status = "closed";
    else return fail("Unauthorized.", 401);

    await env.DB.prepare("UPDATE chess_games SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, now, id)
      .run();
    return ok({ status });
  }

  if (body.action === "verify") {
    const key = env.MODERATION_KEY;
    if (!key || typeof body.key !== "string" || body.key !== key) return fail("Unauthorized.", 401);
    return ok({ verified: true });
  }

  return fail("Unknown action.", 400);
};
