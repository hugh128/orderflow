import { afterAll, beforeEach } from "vitest";
import { resetDb, testSql } from "./db";

beforeEach(resetDb);
afterAll(() => testSql.end({ timeout: 1 }));
