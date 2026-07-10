/// <reference types="astro/client" />

// Minimal D1 surface we use — avoids pulling in @cloudflare/workers-types.
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
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
}

type CloudflareRuntime = import("@astrojs/cloudflare").Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends CloudflareRuntime {}
}
