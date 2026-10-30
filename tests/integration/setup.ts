import { afterAll, beforeEach, vi } from "vitest";
import { resetDb, repoSql, testSql } from "./db";

vi.mock("@/lib/db/client", async () => {
  const { testDb, repoSql } = await import("./db");
  return { db: testDb, sql: repoSql };
});

beforeEach(resetDb);
afterAll(async () => {
  await Promise.all([testSql.end({ timeout: 1 }), repoSql.end({ timeout: 1 })]);
});
