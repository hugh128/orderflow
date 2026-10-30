import "dotenv/config";
import postgres from "postgres";
import { getTestDatabaseUrl } from "../helpers/test-database-url";

const url = getTestDatabaseUrl();
export const testSql = postgres(url, { prepare: false, max: 1, connect_timeout: 5 });

export async function resetDb() {
  if (getTestDatabaseUrl() !== url) throw new Error("La conexión de pruebas cambió durante la suite");
  await testSql`TRUNCATE TABLE packages, orders CASCADE`;
}
