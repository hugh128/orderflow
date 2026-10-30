import { testSql } from "./db";

export async function concurrentWrites<T>(
  table: "orders" | "packages",
  writes: () => [Promise<T>, Promise<T>],
) {
  const locker = await testSql.reserve();
  let results: Promise<PromiseSettledResult<T>[]> | undefined;
  let transactionOpen = false;
  try {
    await locker`BEGIN`;
    transactionOpen = true;
    await locker`LOCK TABLE ${locker(table)} IN SHARE MODE`;
    results = Promise.allSettled(writes());
    const deadline = Date.now() + 3_000;
    let waiting = 0;
    while (waiting < 2 && Date.now() < deadline) {
      const [row] = await testSql<{ count: number }[]>`
        SELECT count(DISTINCT pid)::int AS count FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock'
          AND query ILIKE ${`%${table}%`}
      `;
      waiting = row.count;
      if (waiting < 2) await new Promise((resolve) => setTimeout(resolve, 10));
    }
    if (waiting !== 2) {
      throw new Error("No se observaron dos escrituras concurrentes; revisa el pool de conexiones");
    }
    await locker`COMMIT`;
    transactionOpen = false;
    return await results;
  } finally {
    if (transactionOpen) await locker`ROLLBACK`;
    locker.release();
    await results;
  }
}
