/**
 * api.ts — server-only helpers for the D1 API routes.
 *
 * Imported only by src/pages/api/*. Handles JSON responses, salted IP hashing,
 * sliding-window rate limiting, and request-body validation.
 */

import type { APIContext } from "astro";
import { moderate } from "./moderation";

const DEFAULT_SALT = "aryansingh-org-static-salt-v1";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const ok = (data: Record<string, unknown> = {}, status = 200) =>
  json({ ok: true, ...data }, status);
export const fail = (error: string, status = 400) => json({ ok: false, error }, status);

/** Cloudflare runtime env, or throw a clear error if the binding is missing. */
export function getEnv(ctx: APIContext): CloudflareEnv {
  const env = ctx.locals?.runtime?.env;
  if (!env?.DB) throw new Error("D1 binding DB is not available");
  return env as unknown as CloudflareEnv;
}

/** SHA-256(ip + salt), truncated. Never store the raw IP. */
export async function hashIp(ctx: APIContext, env: CloudflareEnv): Promise<string> {
  const ip =
    ctx.request.headers.get("cf-connecting-ip") ||
    ctx.request.headers.get("x-forwarded-for") ||
    "0.0.0.0";
  const salt = env.IP_SALT || DEFAULT_SALT;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${salt}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/**
 * Sliding-window rate limit. Returns true if the action is allowed and records it.
 * One row per (ip_hash, action); the window resets once it expires.
 */
export async function rateLimit(
  db: D1Database,
  ipHash: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const row = await db
    .prepare("SELECT window_start AS ws, count AS c FROM rate_limits WHERE ip_hash = ? AND action = ?")
    .bind(ipHash, action)
    .first<{ ws: number; c: number }>();

  if (!row || row.ws < windowStart) {
    await db
      .prepare(
        "INSERT INTO rate_limits (ip_hash, action, window_start, count) VALUES (?, ?, ?, 1) " +
          "ON CONFLICT(ip_hash, action) DO UPDATE SET window_start = excluded.window_start, count = 1",
      )
      .bind(ipHash, action, now)
      .run();
    return true;
  }
  if (row.c >= limit) return false;
  await db
    .prepare("UPDATE rate_limits SET count = count + 1 WHERE ip_hash = ? AND action = ?")
    .bind(ipHash, action)
    .run();
  return true;
}

export async function readBody(ctx: APIContext): Promise<Record<string, unknown>> {
  try {
    const b = await ctx.request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Trimmed string within [1, max]; returns null if invalid/empty. */
export function cleanStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > max) return null;
  return s;
}

export function optName(v: unknown, max: number, fallback = "anon"): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return fallback;
  return s.slice(0, max);
}

export function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** True if the honeypot field was filled (a bot). */
export const isBot = (body: Record<string, unknown>): boolean =>
  typeof body.website === "string" && body.website.trim().length > 0;

/** Run text through the language/spam filter; returns an error string or null. */
export function checkClean(text: string): string | null {
  const v = moderate(text);
  return v.clean ? null : v.reason ?? "Message rejected.";
}
