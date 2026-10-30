import { describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "../helpers/test-database-url";

describe("T08: protección de la base de integración", () => {
  const local = "postgres://postgres:postgres@127.0.0.1:5433/orders_test";

  it("T08: exige TEST_DATABASE_URL sin fallback a producción", () => {
    expect(() => getTestDatabaseUrl({ DATABASE_URL: local })).toThrow("TEST_DATABASE_URL es obligatoria");
  });

  it.each([
    "postgres://user:secret@db.example.supabase.co:5432/orders_test",
    "postgres://user:secret@aws-0-us-east-1.pooler.supabase.com:5432/orders_test",
    "postgres://user:secret@db.example.com:5432/orders_test",
    "postgres://user:secret@127.0.0.1:5433/postgres",
    "https://localhost/orders_test",
    "not a URL",
  ])("T08: rechaza un destino no permitido (%#)", (url) => {
    expect(() => getTestDatabaseUrl({ TEST_DATABASE_URL: url })).toThrow();
  });

  it.each(["DATABASE_URL", "DATABASE_URL_DIRECT"])(
    "T08: rechaza la misma BD que %s aunque cambien credenciales y alias local",
    (key) => {
      expect(() => getTestDatabaseUrl({
        TEST_DATABASE_URL: local,
        [key]: "postgres://other:secret@localhost:5433/orders_test",
      })).toThrow("coincide con una base de la aplicación");
    },
  );

  it.each([local, "postgres://postgres:postgres@localhost:5432/orders_test"])(
    "T08: acepta una BD local dedicada (%#)",
    (url) => expect(getTestDatabaseUrl({ TEST_DATABASE_URL: url })).toBe(url),
  );
});
