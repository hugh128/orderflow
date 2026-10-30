import { describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { splitIntoPackages } from "@/lib/domain/split-into-packages";
import { DuplicateOrderNumberError } from "@/lib/db/errors";
import { createOrderWithPackages } from "@/lib/db/repo";
import { createOrderSchema } from "@/lib/schemas/order";
import { getTestDatabaseUrl } from "../helpers/test-database-url";
import { concurrentWrites } from "./concurrent-writes";
import { queryLog, testSql as sql } from "./db";

vi.mock("@/lib/domain/split-into-packages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domain/split-into-packages")>();
  return { ...actual, splitIntoPackages: vi.fn(actual.splitIntoPackages) };
});

const input = (units = 250, number = "A-1") => createOrderSchema.parse({ number, customer: "Textiles Sol", units });

describe("createOrderWithPackages", () => {
  it.each([
    ["CA-01", 250, [100, 100, 50]],
    ["CA-02", 100, [100]],
    ["CA-03", 101, [100, 1]],
    ["CA-04", 1, [1]],
  ] as const)("%s: crea %i unidades con paquetes %j", async (_ca, units, expected) => {
    const result = await createOrderWithPackages(input(units));
    expect(result.order).toMatchObject({ number: "A-1", customer: "Textiles Sol", totalUnits: units });
    expect(result.packages.map((pkg) => pkg.units)).toEqual(expected);
    expect(result.packages.map((pkg) => pkg.sequence)).toEqual(expected.map((_, index) => index + 1));
    expect(result.packages.every((pkg) => pkg.status === "pending" && pkg.orderId === result.order.id)).toBe(true);
  });

  it("CA-05: crea 1 000 paquetes conservando la suma con un único INSERT por tabla y sin SELECT previo", async () => {
    const result = await createOrderWithPackages(input(100_000));
    expect(result.packages).toHaveLength(1_000);
    expect(result.packages.reduce((sum, pkg) => sum + pkg.units, 0)).toBe(100_000);
    expect(queryLog.filter((query) => /insert into "orders"/i.test(query))).toHaveLength(1);
    expect(queryLog.filter((query) => /insert into "packages"/i.test(query))).toHaveLength(1);
    expect(queryLog.filter((query) => /^select/i.test(query))).toHaveLength(0);
  });

  it("CA-06: revierte el pedido si falla la inserción de paquetes y propaga el error", async () => {
    vi.mocked(splitIntoPackages).mockReturnValueOnce([101]);
    await expect(createOrderWithPackages(input())).rejects.toMatchObject({ cause: { code: "23514" } });
    expect(await sql`SELECT id FROM orders`).toHaveLength(0);
    expect(await sql`SELECT id FROM packages`).toHaveLength(0);
  });

  it.each(["A-1", "a-1", " A-1 "])("CA-09: rechaza el número repetido %s sin crear filas extra", async (number) => {
    await createOrderWithPackages(input());
    await expect(createOrderWithPackages(input(100, number))).rejects.toBeInstanceOf(DuplicateOrderNumberError);
    expect(await sql`SELECT id FROM orders`).toHaveLength(1);
    expect(await sql`SELECT id FROM packages`).toHaveLength(3);
  });

  it("CA-10: dos creaciones realmente concurrentes producen un éxito y un duplicado", async () => {
    const results = await concurrentWrites("orders", () => [
      createOrderWithPackages(input()), createOrderWithPackages(input(250, "a-1")),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(DuplicateOrderNumberError);
    expect(await sql`SELECT id FROM orders`).toHaveLength(1);
    expect(await sql`SELECT id FROM packages`).toHaveLength(3);
  });

  it("CA-27: el pedido y sus paquetes persisten al abrir otra conexión", async () => {
    const result = await createOrderWithPackages(input());
    const fresh = postgres(getTestDatabaseUrl(), { prepare: false, max: 1 });
    try {
      expect(await fresh`SELECT id FROM orders WHERE id = ${result.order.id}`).toHaveLength(1);
      expect(await fresh`SELECT units FROM packages WHERE order_id = ${result.order.id} ORDER BY sequence`)
        .toEqual([{ units: 100 }, { units: 100 }, { units: 50 }]);
    } finally { await fresh.end({ timeout: 1 }); }
  });
});
