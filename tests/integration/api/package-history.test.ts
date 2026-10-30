import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { GET } from "@/app/api/packages/[id]/history/route";
import { createOrderWithPackages, transitionPackage } from "@/lib/db/repo";
import { testSql as sql } from "../db";

const read = (id: string) =>
  GET(new Request("http://localhost"), { params: Promise.resolve({ id }) });
it("CA-45: vacío, eventos ordenados y motivos ISO; sin historia inventada", async () => {
  const { packages } = await createOrderWithPackages({
    number: "H-1",
    customer: "Ejemplo",
    units: 100,
  });
  const id = packages[0].id;
  expect(await (await read(id)).json()).toEqual([]);
  await transitionPackage(id, "pending", "advance");
  await transitionPackage(id, "in_progress", "advance");
  await transitionPackage(id, "review", "reject", "Revisar acabado");
  const response = await read(id);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.map((event: { kind: string }) => event.kind)).toEqual([
    "advance",
    "advance",
    "reject",
  ]);
  expect(data[2]).toMatchObject({
    reason: "Revisar acabado",
    fromStatus: "review",
    toStatus: "in_progress",
    createdAt: expect.any(String),
  });
  expect(new Date(data[2].createdAt).toISOString()).toBe(data[2].createdAt);
});
it("CA-45: UUID inválido 400 y válido inexistente 404", async () => {
  expect((await read("abc")).status).toBe(400);
  expect((await read(randomUUID())).status).toBe(404);
});

it("CA-45: limita a los últimos cincuenta y mantiene orden estable con fechas iguales", async () => {
  const { packages } = await createOrderWithPackages({ number: "LIMIT-1", customer: "Ejemplo", units: 100 });
  const id = packages[0].id;
  const inserted = await sql`insert into package_events(package_id,from_status,to_status,kind,created_at)
    select ${id},'pending','in_progress','advance','2026-10-30T00:00:00Z' from generate_series(1,55) returning id`;
  const data = await (await read(id)).json();
  expect(data).toHaveLength(50);
  expect(data.map((event: { id: number }) => event.id)).toEqual(inserted.slice(5).map(event => event.id));
});
