/// <reference types="astro/client" />

// Minimal D1 surface we use — avoids pulling in @cloudflare/workers-types.
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta: { changes: number; last_row_id?: number } }>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<unknown>;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

interface CloudflareEnv {
  DB: D1Database;
  MODERATION_KEY?: string;
  IP_SALT?: string;
  /** Optional webhook (n8n / Discord / Slack) pinged when a visitor's chess move puts it on the owner's turn. */
  NOTIFY_WEBHOOK?: string;
}

type CloudflareRuntime = import("@astrojs/cloudflare").Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends CloudflareRuntime {}
}
