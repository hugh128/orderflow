import { drizzle } from "drizzle-orm/postgres-js";
import { createSqlClient } from "./connection";
import * as schema from "./schema";

const developmentGlobal = globalThis as typeof globalThis & {
  orderflowSql?: ReturnType<typeof createSqlClient>;
};
let client: ReturnType<typeof createSqlClient> | undefined;
let database: ReturnType<typeof createDatabase> | undefined;

export function getSql() {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL es obligatoria para conectar la aplicación");
  const development = process.env.NODE_ENV === "development";
  client = (development ? developmentGlobal.orderflowSql : undefined) ?? createSqlClient(url);
  if (development) developmentGlobal.orderflowSql = client;
  return client;
}

function createDatabase() {
  return drizzle(getSql(), { schema });
}

export function getDb() {
  return database ??= createDatabase();
}
