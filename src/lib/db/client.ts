import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL es obligatoria para conectar la aplicación");

const developmentGlobal = globalThis as typeof globalThis & {
  orderflowSql?: ReturnType<typeof postgres>;
};
const development = process.env.NODE_ENV === "development";

export const sql = (development ? developmentGlobal.orderflowSql : undefined)
  ?? postgres(url, { prepare: false, max: 1 });

if (development) developmentGlobal.orderflowSql = sql;

export const db = drizzle(sql, { schema });
