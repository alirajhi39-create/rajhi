import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * العميل يدعم بيئتين تلقائيًا:
 *  - Neon (Vercel / serverless): عبر HTTP driver — لا يحتاج TCP ولا إعداد SSL.
 *  - PostgreSQL محلي: عبر node-postgres (pg).
 * ويُهيَّأ عند أول استخدام فقط، حتى لا يفشل البناء إن لم يُضبط DATABASE_URL.
 */

export type Db = NodePgDatabase<typeof schema>;

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "postgres", "db"];

export function databaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    undefined
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isNeonUrl(url: string): boolean {
  const host = hostOf(url);
  return host.endsWith("neon.tech") || host.endsWith("neon.com") || host.includes(".neon.");
}

function isLocalUrl(url: string): boolean {
  return LOCAL_HOSTS.includes(hostOf(url));
}

function createDb(): Db {
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL غير مضبوط. أضف متغير البيئة DATABASE_URL (رابط Neon أو PostgreSQL المحلي) ثم أعد التشغيل.",
    );
  }

  // Neon أو أي مضيف بعيد: استخدم مشغّل HTTP الخالي من الاتصالات الدائمة
  if (!isLocalUrl(url)) {
    const sql = neon(url);
    return drizzleNeon(sql, { schema }) as unknown as Db;
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
  return drizzlePg(pool, { schema });
}

const globalForDb = globalThis as typeof globalThis & { __altyammumDb?: Db };

function getDb(): Db {
  if (!globalForDb.__altyammumDb) globalForDb.__altyammumDb = createDb();
  return globalForDb.__altyammumDb;
}

/** واجهة كسولة: تُنشئ الاتصال عند أول استعلام فقط */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>;
    const value = instance[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

export type { NeonHttpDatabase };
export { schema };
