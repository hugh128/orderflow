import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.DATABASE_URL_DIRECT;
if (!migrationUrl) throw new Error("DATABASE_URL_DIRECT es obligatoria para las herramientas de migración");

// https://orm.drizzle.team/docs/drizzle-config-file
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: migrationUrl },
});
