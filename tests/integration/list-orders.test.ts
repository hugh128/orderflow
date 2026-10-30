import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { createOrderWithPackages, getOrder, listOrders } from "@/lib/db/repo";
import { createOrderSchema } from "@/lib/schemas/order";
import { getTestDatabaseUrl } from "../helpers/test-database-url";
import { queryLog, testSql as sql } from "./db";

async function create(number = "A-1", units = 250) {
  return createOrderWithPackages(createOrderSchema.parse({ number, customer: "Textiles Sol", units }));
}

describe("consultas de pedidos", () => {
  it("CA-29: lista vacía devuelve [] y ejecuta una sola consulta", async () => {
    expect(await listOrders()).toEqual([]);
    expect(queryLog).toHaveLength(1);
  });

  it("CA-29: ordena del más reciente al más antiguo con fechas explícitas", async () => {
    for (const [number, date] of [
      ["MEDIO", "2026-01-02"], ["NUEVO", "2026-01-03"], ["ANTIGUO", "2026-01-01"],
    ]) {
      const { order } = await create(number);
      await sql`UPDATE orders SET created_at = ${date}::timestamptz WHERE id = ${order.id}`;
    }
    expect((await listOrders()).map((order) => order.number)).toEqual(["NUEVO", "MEDIO", "ANTIGUO"]);
  });

  it("CA-29: cinco pedidos usan dos consultas reales, sin N+1", async () => {
    for (let i = 0; i < 5; i++) await create(`A-${i}`, i === 0 ? 250 : 100);
    await sql`UPDATE packages SET status = 'done' WHERE units = 50`;
    queryLog.length = 0;
    const result = await listOrders();
    expect(result).toHaveLength(5);
    expect(queryLog).toHaveLength(2);
    expect(queryLog.every((query) => /^select/i.test(query))).toBe(true);
    expect(result.find((order) => order.number === "A-0")?.summary.percent).toBe(20);
    expect(result.filter((order) => order.number !== "A-0").every((order) => order.summary.percent === 0)).toBe(true);
    expect(result.every((order) => !("packages" in order))).toBe(true);
  });

  it.each([
    ["CA-22", 250, [1], 40, 100, { pending: 2, in_progress: 0, review: 0, done: 1 }],
    ["CA-23", 250, [3], 20, 50, { pending: 2, in_progress: 0, review: 0, done: 1 }],
    ["CA-24", 250, [1, 2, 3], 100, 250, { pending: 0, in_progress: 0, review: 0, done: 3 }],
    ["CA-25", 250, [], 0, 0, { pending: 3, in_progress: 0, review: 0, done: 0 }],
    ["CA-26", 300, [1], 33, 100, { pending: 2, in_progress: 0, review: 0, done: 1 }],
  ] as const)("%s: listado y detalle calculan el avance de %i unidades", async (_ca, units, done, percent, doneUnits, counts) => {
    const { order } = await create("A-1", units);
    for (const sequence of done) {
      await sql`UPDATE packages SET status = 'done' WHERE order_id = ${order.id} AND sequence = ${sequence}`;
    }
    const summary = { percent, doneUnits, counts, totalUnits: units, totalPackages: 3 };
    expect((await listOrders())[0].summary).toEqual(summary);
    const detail = await getOrder(order.id);
    expect(detail?.summary).toEqual(summary);
    expect(Object.values(detail!.summary.counts).reduce((sum, count) => sum + count, 0)).toBe(3);
  });

  it("CA-25: el resumen incluye estados intermedios y sus ceros", async () => {
    const { order } = await create();
    await sql`UPDATE packages SET status = 'in_progress' WHERE order_id = ${order.id} AND sequence = 1`;
    await sql`UPDATE packages SET status = 'review' WHERE order_id = ${order.id} AND sequence = 2`;
    expect((await getOrder(order.id))?.summary.counts).toEqual({ pending: 1, in_progress: 1, review: 1, done: 0 });
  });

  it("CA-27: otra conexión lee los mismos datos y estados persistidos", async () => {
    const { order } = await create();
    await sql`UPDATE packages SET status = 'done' WHERE order_id = ${order.id} AND sequence = 3`;
    const detail = await getOrder(order.id);
    const fresh = postgres(getTestDatabaseUrl(), { prepare: false, max: 1 });
    try {
      const [stored] = await fresh`SELECT id, number, customer, total_units FROM orders WHERE id = ${order.id}`;
      expect(stored).toEqual({ id: detail?.id, number: detail?.number, customer: detail?.customer, total_units: detail?.totalUnits });
      expect(await fresh`SELECT id, sequence, units, status FROM packages WHERE order_id = ${order.id} ORDER BY sequence`)
        .toEqual(detail?.packages.map(({ id, sequence, units, status }) => ({ id, sequence, units, status })));
      expect(detail?.summary.percent).toBe(20);
    } finally { await fresh.end({ timeout: 1 }); }
  });

  it("CA-29: getOrder ordena los paquetes por sequence", async () => {
    const { order, packages } = await create();
    await sql`UPDATE packages SET sequence = 4 WHERE id = ${packages[0].id}`;
    expect((await getOrder(order.id))?.packages.map((pkg) => pkg.sequence)).toEqual([2, 3, 4]);
  });

  it("CA-29: getOrder devuelve null si el pedido no existe", async () => {
    queryLog.length = 0;
    expect(await getOrder("00000000-0000-4000-8000-000000000001")).toBeNull();
    expect(queryLog).toHaveLength(1);
  });
});
