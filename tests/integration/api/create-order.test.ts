import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/orders/route";
import { getSql } from "@/lib/db/client";
import { repoSql, queryLog, testSql as sql } from "../db";

const valid = { number: "A-1", customer: "Textiles Sol", units: 250 };
const request = (value: unknown) => new Request("http://localhost/api/orders", {
  method: "POST", body: JSON.stringify(value), headers: { "content-type": "application/json" },
});

describe("POST /api/orders", () => {
  it("CA-12: el handler usa exclusivamente el cliente local de integración", () => {
    expect(getSql()).toBe(repoSql);
    expect(["localhost", "127.0.0.1", "::1"]).toContain(repoSql.options.host[0]);
    expect(repoSql.options.database).toBe("orders_test");
  });

  it("CA-01: HTTP directo crea 250 unidades y devuelve OrderDetailDTO completo", async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({
      id: expect.any(String), number: valid.number, customer: valid.customer, totalUnits: 250,
      createdAt: expect.any(String),
      summary: { counts: { pending: 3, in_progress: 0, review: 0, done: 0 }, totalPackages: 3, totalUnits: 250, doneUnits: 0, percent: 0 },
      packages: [100, 100, 50].map((units, index) => ({ id: expect.any(String), sequence: index + 1, units, status: "pending", updatedAt: expect.any(String) })),
    });
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
    expect(await sql`SELECT id FROM orders`).toHaveLength(1);
    expect(await sql`SELECT id FROM packages`).toHaveLength(3);
  });

  it.each([
    ...[0, -5, 10.5, "", "  ", "abc", "1e2", "-5", "10.5", null, undefined, NaN, Infinity].map((value) => ["CA-07", "units", value]),
    ...[100001, "99999999999999999999"].map((value) => ["CA-08", "units", value]),
    ...["", "   ", "A".repeat(31)].map((value) => ["CA-11", "number", value]),
    ...["", "   ", "A".repeat(101)].map((value) => ["CA-11", "customer", value]),
  ])("%s/CA-12: HTTP rechaza %s=%j antes de consultar la BD", async (_ca, field, value) => {
    const response = await POST(request({ ...valid, [field as string]: value }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fieldErrors[field as string]).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(queryLog).toHaveLength(0);
    expect(await sql`SELECT id FROM orders`).toHaveLength(0);
    expect(await sql`SELECT id FROM packages`).toHaveLength(0);
  });

  it.each(["A-1", "a-1", " A-1 "])("CA-09: duplicado %s devuelve 409 sin filas adicionales", async (number) => {
    await POST(request(valid));
    const response = await POST(request({ ...valid, number }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "DUPLICATE_ORDER_NUMBER", message: "El número de pedido ya existe" } });
    expect(await sql`SELECT id FROM orders`).toHaveLength(1);
    expect(await sql`SELECT id FROM packages`).toHaveLength(3);
  });

  it.each(["{", "", "[]", "null", '"texto"', "42", "true"])("CA-12: cuerpo %s devuelve INVALID_JSON sin escribir", async (body) => {
    const response = await POST(new Request("http://localhost/api/orders", { method: "POST", body }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
    expect(queryLog).toHaveLength(0);
    expect(await sql`SELECT id FROM orders`).toHaveLength(0);
    expect(await sql`SELECT id FROM packages`).toHaveLength(0);
  });

  it("CA-12: acepta string numérico e ignora campos extra", async () => {
    const response = await POST(request({ ...valid, units: "250", status: "done", totalUnits: 1 }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.totalUnits).toBe(250);
    expect(body.packages.map((pkg: { status: string }) => pkg.status)).toEqual(["pending", "pending", "pending"]);
    expect(body).not.toHaveProperty("status");
  });
});
