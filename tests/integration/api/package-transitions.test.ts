import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { POST as advance } from "@/app/api/packages/[id]/advance/route";
import { POST as reject } from "@/app/api/packages/[id]/reject/route";
import { createOrderWithPackages } from "@/lib/db/repo";
import type { PackageStatus } from "@/lib/domain/types";
import { createOrderSchema } from "@/lib/schemas/order";
import { concurrentWrites } from "../concurrent-writes";
import { queryLog, testSql as sql } from "../db";

const handlers = { advance, reject };
function call(kind: keyof typeof handlers, id: string, expectedStatus: string) {
  return handlers[kind](new Request(`http://localhost/api/packages/${id}/${kind}`, {
    method: "POST", body: JSON.stringify({ expectedStatus }),
  }), { params: Promise.resolve({ id }) });
}
async function fixture(status: PackageStatus = "pending") {
  const result = await createOrderWithPackages(createOrderSchema.parse({ number: "A-1", customer: "Sol", units: 250 }));
  const pkg = result.packages[0];
  await sql`UPDATE packages SET status = ${status} WHERE id = ${pkg.id}`;
  queryLog.length = 0;
  return pkg.id;
}
async function storedStatus(id: string) {
  const [row] = await sql`SELECT status FROM packages WHERE id = ${id}`;
  return row.status;
}

describe("POST de transición de paquetes", () => {
  it.each([
    ["CA-13", "pending", "in_progress"], ["CA-14", "in_progress", "review"], ["CA-15", "review", "done"],
  ] as const)("%s: avance desde %s devuelve 200 y persiste %s", async (_ca, from, to) => {
    const id = await fixture(from);
    const response = await call("advance", id, from);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.package).toMatchObject({ id, sequence: 1, units: 100, status: to, updatedAt: expect.any(String) });
    expect(body.package).not.toHaveProperty("orderId");
    expect(body.order).toMatchObject({ number: "A-1", totalUnits: 250, createdAt: expect.any(String) });
    expect(body.order).not.toHaveProperty("packages");
    expect(await storedStatus(id)).toBe(to);
  });

  it("CA-19/CA-21: rechazo y nuevos avances completan el ciclo", async () => {
    const id = await fixture("review");
    for (const [kind, from, to] of [
      ["reject", "review", "in_progress"], ["advance", "in_progress", "review"], ["advance", "review", "done"],
    ] as const) {
      const response = await call(kind, id, from);
      expect(response.status).toBe(200);
      expect((await response.json()).package.status).toBe(to);
      expect(await storedStatus(id)).toBe(to);
    }
  });

  it.each([
    ["CA-16", "advance", "done"], ["CA-20", "reject", "pending"],
    ["CA-20", "reject", "in_progress"], ["CA-20", "reject", "done"],
  ] as const)("%s: %s desde %s devuelve INVALID_TRANSITION sin cambios", async (_ca, kind, status) => {
    const id = await fixture(status);
    const response = await call(kind, id, status);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INVALID_TRANSITION");
    expect(queryLog).toHaveLength(0);
    expect(await storedStatus(id)).toBe(status);
  });

  it("CA-33: expectedStatus obsoleto devuelve conflicto con currentStatus", async () => {
    const id = await fixture("in_progress");
    const response = await call("advance", id, "pending");
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "STATUS_CONFLICT", details: { currentStatus: "in_progress" } } });
    expect(await storedStatus(id)).toBe("in_progress");
  });

  for (const kind of ["advance", "reject"] as const) {
    it.each([{}, { expectedStatus: "enviado" }, { expectedStatus: null }, { expectedStatus: 1 }])(
      `CA-33: ${kind} rechaza expectedStatus inválido %j antes de consultar`, async (body) => {
        const response = await handlers[kind](new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: randomUUID() }) });
        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.details.fieldErrors.expectedStatus).toEqual([expect.any(String)]);
        expect(queryLog).toHaveLength(0);
      },
    );

    it.each(["{", "", "[]", "null"])(`CA-33: ${kind} rechaza cuerpo %s con INVALID_JSON`, async (body) => {
      const response = await handlers[kind](new Request("http://localhost", { method: "POST", body }), { params: Promise.resolve({ id: randomUUID() }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("INVALID_JSON");
      expect(queryLog).toHaveLength(0);
    });

    it(`CA-33: ${kind} rechaza id inválido antes de consultar`, async () => {
      const response = await call(kind, "abc", "review");
      expect(response.status).toBe(400);
      expect((await response.json()).error.details.fieldErrors.id).toEqual([expect.any(String)]);
      expect(queryLog).toHaveLength(0);
    });

    it(`CA-33: ${kind} de UUID inexistente devuelve 404`, async () => {
      const response = await call(kind, randomUUID(), "review");
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    });
  }

  it("CA-18: dos avances HTTP concurrentes producen 200 y 409", async () => {
    const id = await fixture();
    const settled = await concurrentWrites("packages", () => [call("advance", id, "pending"), call("advance", id, "pending")]);
    expect(settled.every((result) => result.status === "fulfilled")).toBe(true);
    const responses = settled.filter((result) => result.status === "fulfilled").map((result) => result.value);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const conflict = responses.find((response) => response.status === 409)!;
    expect((await conflict.json()).error.code).toBe("STATUS_CONFLICT");
    expect(await storedStatus(id)).toBe("in_progress");
  });

  it("CA-17/CA-18: doble clic secuencial no salta estados", async () => {
    const id = await fixture();
    expect((await call("advance", id, "pending")).status).toBe(200);
    const repeated = await call("advance", id, "pending");
    expect(repeated.status).toBe(409);
    expect((await repeated.json()).error.code).toBe("STATUS_CONFLICT");
    expect(await storedStatus(id)).toBe("in_progress");
  });

  it("CA-22: la misma respuesta de avance hasta Listo incluye el nuevo 40 %", async () => {
    const id = await fixture();
    for (const expected of ["pending", "in_progress", "review"]) {
      const response = await call("advance", id, expected);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.order.summary.percent).toBe(expected === "review" ? 40 : 0);
      if (expected === "review") expect(body.order.summary).toEqual({
        counts: { pending: 2, in_progress: 0, review: 0, done: 1 }, totalPackages: 3, totalUnits: 250, doneUnits: 100, percent: 40,
      });
    }
  });
});
