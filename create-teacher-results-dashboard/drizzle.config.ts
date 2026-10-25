import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// يقرأ .env ثم .env.local (القيم الموجودة في البيئة لها الأولوية)
config({ path: ".env" });
config({ path: ".env.local" });

/**
 * للترحيل (drizzle-kit push) استخدم الرابط غير المُجمَّع (unpooled) إن وُجد،
 * لأن PgBouncer لا يدعم أوامر DDL داخل وضع المعاملات.
 */
const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
