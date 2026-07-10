/**
 * interactive.ts — shared contract for the D1-backed interactive layer.
 *
 * Isomorphic: constants are imported by both the server endpoints (validation)
 * and the client islands (rendering + typed fetch). No node/cloudflare imports
 * here so it stays safe on both sides.
 */

export const REACTION_EMOJIS = ["🔥", "❤️", "🚀", "🤯", "👏", "🧠"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

// Sticker palette anyone can drop on the shared wall.
export const STICKER_KINDS = [
  "⭐", "🚀", "🧠", "⚛️", "🧬", "💡", "🔥", "❤️",
  "👾", "🌌", "✨", "🛸", "📈", "🎮", "☕", "🦆",
] as const;
export type StickerKind = (typeof STICKER_KINDS)[number];

// Games that report to the shared leaderboard.
export const LEADERBOARD_GAMES = ["snake", "flappy"] as const;
export type LeaderboardGame = (typeof LEADERBOARD_GAMES)[number];

export const LIMITS = {
  name: 40,
  message: 500,
  comment: 1000,
  stickersMax: 600, // most-recent cap returned by GET /api/stickers
  guestbookMax: 100,
  commentsMax: 400,
  scoresMax: 20, // top-N returned by GET /api/leaderboard
  scoreCap: 10_000_000, // reject absurd submissions
} as const;

// ---- shapes ----------------------------------------------------------------

export interface GuestEntry {
  id: number;
  name: string;
  message: string;
  createdAt: number;
}
export interface Sticker {
  id: number;
  kind: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  createdAt: number;
}
export interface Comment {
  id: number;
  name: string;
  body: string;
  parentId: number | null;
  createdAt: number;
}
export type ReactionCounts = Partial<Record<string, number>>;
export interface ScoreEntry {
  id: number;
  name: string;
  score: number;
  createdAt: number;
}
export interface ChessGame {
  id: number;
  visitorName: string;
  fen: string;
  moves: string;
  turn: "w" | "b";
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface ApiResult<T> {
  status: number;
  ok: boolean;
  error?: string;
  data: T;
}

// ---- typed client (browser) ------------------------------------------------

async function call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api${path}`, {
      headers: { "content-type": "application/json" },
      ...init,
    });
    const data = (await res.json().catch(() => ({ ok: false, error: "bad response" }))) as {
      ok?: boolean;
      error?: string;
    } & T;
    return { status: res.status, ok: Boolean(data.ok), error: data.error, data };
  } catch (e) {
    return {
      status: 0,
      ok: false,
      error: e instanceof Error ? e.message : "network error",
      data: {} as T,
    };
  }
}

export const api = {
  listGuestbook: (limit = 50) =>
    call<{ entries: GuestEntry[] }>(`/guestbook?limit=${limit}`),
  addGuestbook: (body: { name?: string; message: string; website?: string }) =>
    call<{ entry: GuestEntry }>(`/guestbook`, { method: "POST", body: JSON.stringify(body) }),

  listStickers: () => call<{ stickers: Sticker[] }>(`/stickers`),
  addSticker: (body: {
    kind: string;
    x: number;
    y: number;
    rotation?: number;
    scale?: number;
    website?: string;
  }) => call<{ sticker: Sticker }>(`/stickers`, { method: "POST", body: JSON.stringify(body) }),

  getReactions: (targetType: string, targetSlug: string) =>
    call<{ counts: ReactionCounts; mine: string[] }>(
      `/reactions?targetType=${encodeURIComponent(targetType)}&targetSlug=${encodeURIComponent(targetSlug)}`,
    ),
  toggleReaction: (targetType: string, targetSlug: string, emoji: string) =>
    call<{ counts: ReactionCounts; mine: string[]; toggled: "added" | "removed" }>(`/reactions`, {
      method: "POST",
      body: JSON.stringify({ targetType, targetSlug, emoji }),
    }),

  listComments: (targetType: string, targetSlug: string) =>
    call<{ comments: Comment[] }>(
      `/comments?targetType=${encodeURIComponent(targetType)}&targetSlug=${encodeURIComponent(targetSlug)}`,
    ),
  addComment: (body: {
    targetType: string;
    targetSlug: string;
    name?: string;
    body: string;
    parentId?: number;
    website?: string;
  }) => call<{ comment: Comment }>(`/comments`, { method: "POST", body: JSON.stringify(body) }),

  listScores: (game: string, limit = 10) =>
    call<{ scores: ScoreEntry[] }>(`/leaderboard?game=${encodeURIComponent(game)}&limit=${limit}`),
  addScore: (body: { game: string; name?: string; score: number; website?: string }) =>
    call<{ entry: ScoreEntry; rank: number | null }>(`/leaderboard`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  chessList: () => call<{ games: ChessGame[] }>(`/chess`),
  chessGet: (id: number) => call<{ game: ChessGame }>(`/chess?id=${id}`),
  chessCreate: (name: string, website?: string) =>
    call<{ game: ChessGame; token: string }>(`/chess`, {
      method: "POST",
      body: JSON.stringify({ action: "create", name, website }),
    }),
  chessMove: (body: { id: number; token: string; from: string; to: string; promotion?: string }) =>
    call<{ game: ChessGame; san: string }>(`/chess`, {
      method: "POST",
      body: JSON.stringify({ action: "move", ...body }),
    }),
  chessOwnerMove: (body: { id: number; key: string; from: string; to: string; promotion?: string }) =>
    call<{ game: ChessGame; san: string }>(`/chess`, {
      method: "POST",
      body: JSON.stringify({ action: "ownerMove", ...body }),
    }),
  chessResign: (body: { id: number; token?: string; key?: string }) =>
    call<{ status: string }>(`/chess`, {
      method: "POST",
      body: JSON.stringify({ action: "resign", ...body }),
    }),
  chessVerifyKey: (key: string) =>
    call<{ verified: boolean }>(`/chess`, {
      method: "POST",
      body: JSON.stringify({ action: "verify", key }),
    }),
};

/** Compact relative time for feeds ("3m", "2h", "5d"). */
export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
