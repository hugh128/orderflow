import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// https://orm.drizzle.team/docs/drizzle-config-file
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_DIRECT ?? "" },
});
