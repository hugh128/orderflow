import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { createSqlClient } from "@/lib/db/connection";
import * as schema from "@/lib/db/schema";
import { getTestDatabaseUrl } from "../helpers/test-database-url";

const url = getTestDatabaseUrl();
export const testSql = createSqlClient(url, 5);
export const queryLog: string[] = [];
export const repoSql = createSqlClient(url, 5);
export const testDb = drizzle(repoSql, {
  schema,
  logger: { logQuery: (query) => { queryLog.push(query); } },
});

export async function resetDb() {
  if (getTestDatabaseUrl() !== url) throw new Error("La conexión de pruebas cambió durante la suite");
  await testSql`TRUNCATE TABLE package_events, packages, orders CASCADE`;
  queryLog.length = 0;
}
