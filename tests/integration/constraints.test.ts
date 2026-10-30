import { describe, expect, it } from "vitest";
import { testSql as sql } from "./db";

async function createOrder(number = "A-1", total = 100) {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO orders (number, customer, total_units)
    VALUES (${number}, 'Textiles Sol', ${total}) RETURNING id
  `;
  return row.id;
}

describe("CA-28: integridad de PostgreSQL con SQL directo", () => {
  it.each(["a-1", " A-1 "])("CA-28: rechaza el número equivalente %s", async (number) => {
    await createOrder();
    await expect(createOrder(number)).rejects.toMatchObject({ code: "23505", constraint_name: "orders_number_unique_ci" });
  });

  it.each([0, 101])("CA-28: rechaza un paquete de %i unidades", async (units) => {
    const id = await createOrder();
    await expect(sql`INSERT INTO packages (order_id, sequence, units) VALUES (${id}, 1, ${units})`)
      .rejects.toMatchObject({ code: "23514", constraint_name: "packages_units_range" });
  });

  it.each([0, 100_001])("CA-28: rechaza un pedido de %i unidades", async (units) => {
    await expect(createOrder("A-1", units)).rejects.toMatchObject({ code: "23514", constraint_name: "orders_total_units_range" });
  });

  it("CA-28: impide repetir sequence dentro del mismo pedido", async () => {
    const id = await createOrder();
    await sql`INSERT INTO packages (order_id, sequence, units) VALUES (${id}, 1, 100)`;
    await expect(sql`INSERT INTO packages (order_id, sequence, units) VALUES (${id}, 1, 1)`)
      .rejects.toMatchObject({ code: "23505" });
  });

  it("CA-28: impide estados fuera del enum", async () => {
    const id = await createOrder();
    await expect(sql`INSERT INTO packages (order_id, sequence, units, status) VALUES (${id}, 1, 100, 'enviado')`)
      .rejects.toMatchObject({ code: "22P02" });
  });

  it("CA-28: exige un pedido existente para cada paquete", async () => {
    await expect(sql`INSERT INTO packages (order_id, sequence, units) VALUES ('00000000-0000-4000-8000-000000000001', 1, 100)`)
      .rejects.toMatchObject({ code: "23503" });
  });

  it("CA-28: borrar un pedido elimina sus paquetes por cascada", async () => {
    const id = await createOrder();
    await sql`INSERT INTO packages (order_id, sequence, units) VALUES (${id}, 1, 100)`;
    await sql`DELETE FROM orders WHERE id = ${id}`;
    expect(await sql`SELECT id FROM packages WHERE order_id = ${id}`).toHaveLength(0);
  });

  it("CA-28: genera IDs, fechas y estado inicial Pendiente", async () => {
    const id = await createOrder();
    const [pkg] = await sql`INSERT INTO packages (order_id, sequence, units) VALUES (${id}, 1, 100) RETURNING id, status, updated_at`;
    expect(pkg).toMatchObject({ id: expect.any(String), status: "pending", updated_at: expect.any(Date) });
  });

  it("CA-28: activa RLS sin políticas y conserva el orden del enum", async () => {
    const tables = await sql`SELECT relname, relrowsecurity FROM pg_class WHERE oid IN ('public.orders'::regclass, 'public.packages'::regclass) ORDER BY relname`;
    expect(tables).toEqual([{ relname: "orders", relrowsecurity: true }, { relname: "packages", relrowsecurity: true }]);
    expect(await sql`SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('orders', 'packages')`).toHaveLength(0);
    const states = await sql`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = enumtypid WHERE typname = 'package_status' ORDER BY enumsortorder`;
    expect(states.map((state) => state.enumlabel)).toEqual(["pending", "in_progress", "review", "done"]);
  });

  it.each([0, -1])("CA-28: rechaza sequence=%i", async (sequence) => {
    const id = await createOrder();
    await expect(sql`INSERT INTO packages (order_id, sequence, units) VALUES (${id}, ${sequence}, 100)`)
      .rejects.toMatchObject({ code: "23514", constraint_name: "packages_sequence_positive" });
  });

  it.each([
    ["", "Cliente"], ["   ", "Cliente"], ["x".repeat(31), "Cliente"],
    ["A-1", ""], ["A-1", "   "], ["A-1", "x".repeat(101)],
  ])("CA-28: valida longitudes de número y cliente (%#)", async (number, customer) => {
    await expect(sql`INSERT INTO orders (number, customer, total_units) VALUES (${number}, ${customer}, 100)`)
      .rejects.toMatchObject({ code: "23514" });
  });
});
