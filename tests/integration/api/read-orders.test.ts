import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GET as list } from "@/app/api/orders/route";
import { GET as detail } from "@/app/api/orders/[id]/route";
import { createOrderWithPackages } from "@/lib/db/repo";
import { createOrderSchema } from "@/lib/schemas/order";
import { queryLog, testSql as sql } from "../db";

const req = new Request("http://localhost/api/orders");
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const create = (number: string) => createOrderWithPackages(createOrderSchema.parse({ number, customer: "Sol", units: 250 }));

describe("GET de pedidos", () => {
  it("CA-29: listado vacío devuelve 200 []", async () => {
    const response = await list();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("CA-29: listado más reciente primero con resumen y fechas ISO", async () => {
    const old = await create("ANTIGUO");
    const recent = await create("RECIENTE");
    await sql`UPDATE orders SET created_at = '2020-01-01Z' WHERE id = ${old.order.id}`;
    await sql`UPDATE orders SET created_at = '2021-01-01Z' WHERE id = ${recent.order.id}`;
    await sql`UPDATE packages SET status = 'done' WHERE order_id = ${recent.order.id} AND sequence = 3`;
    const response = await list();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.map((order: { number: string }) => order.number)).toEqual(["RECIENTE", "ANTIGUO"]);
    expect(body.map((order: { summary: { percent: number } }) => order.summary.percent)).toEqual([20, 0]);
    expect(body[0].createdAt).toBe("2021-01-01T00:00:00.000Z");
    expect(body[0]).not.toHaveProperty("packages");
  });

  it("CA-30: detalle acepta UUID real de Postgres y ordena paquetes", async () => {
    const { order, packages } = await create("A-1");
    await sql`UPDATE packages SET sequence = 4 WHERE id = ${packages[0].id}`;
    const response = await detail(req, ctx(order.id));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(order.id);
    expect(body.packages.map((pkg: { sequence: number }) => pkg.sequence)).toEqual([2, 3, 4]);
    expect(body.packages[0]).not.toHaveProperty("orderId");
    expect(new Date(body.packages[0].updatedAt).toISOString()).toBe(body.packages[0].updatedAt);
    expect(body.summary.percent).toBe(0);
  });

  it.each(["abc", "123", "", "00000000-0000-4000-0000-000000000000"])("CA-30: id inválido %s devuelve 400 sin consultas", async (id) => {
    const response = await detail(req, ctx(id));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fieldErrors.id).toEqual([expect.any(String)]);
    expect(queryLog).toHaveLength(0);
  });

  it("CA-30: UUID válido inexistente devuelve 404", async () => {
    const response = await detail(req, ctx(randomUUID()));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });
});
