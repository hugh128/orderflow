import "dotenv/config";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getTestDatabaseUrl } from "../helpers/test-database-url";

export default async function setup() {
  let url: string;
  try {
    url = getTestDatabaseUrl();
  } catch (error) {
    // Mantener visible el diagnóstico aunque el runner falle al formatear el stack.
    console.error(error instanceof Error ? error.message : "Configuración de integración inválida");
    throw error;
  }
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 5 });
  try {
    await migrate(drizzle(sql), {
      migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
