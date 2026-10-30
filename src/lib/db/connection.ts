import postgres from "postgres";

export function createSqlClient(url: string, max = 1) {
  return postgres(url, { prepare: false, max });
}
