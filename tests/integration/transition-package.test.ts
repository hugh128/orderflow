import { describe, expect, it } from "vitest";
import { NotFoundError, StatusConflictError } from "@/lib/db/errors";
import { createOrderWithPackages, transitionPackage } from "@/lib/db/repo";
import { InvalidTransitionError } from "@/lib/domain/package-status";
import type { PackageStatus } from "@/lib/domain/types";
import { createOrderSchema } from "@/lib/schemas/order";
import { concurrentWrites } from "./concurrent-writes";
import { queryLog, testSql as sql } from "./db";

async function fixture(status: PackageStatus = "pending") {
  const { packages } = await createOrderWithPackages(createOrderSchema.parse({
    number: "A-1", customer: "Textiles Sol", units: 100,
  }));
  const id = packages[0].id;
  await sql`UPDATE packages SET status = ${status}, updated_at = '2000-01-01T00:00:00Z' WHERE id = ${id}`;
  queryLog.length = 0;
  return id;
}

async function persisted(id: string) {
  const [row] = await sql`SELECT status, updated_at FROM packages WHERE id = ${id}`;
  return row;
}

describe("transitionPackage", () => {
  it.each([
    ["CA-13", "pending", "in_progress"],
    ["CA-14", "in_progress", "review"],
    ["CA-15", "review", "done"],
  ] as const)("%s: avanzar desde %s persiste %s y actualiza la fecha", async (_ca, from, to) => {
    const id = await fixture(from);
    const result = await transitionPackage(id, from, "advance");
    const stored = await persisted(id);
    expect(result).toMatchObject({ id, status: to });
    expect(result.updatedAt.getTime()).toBeGreaterThan(Date.parse("2000-01-01T00:00:00Z"));
    expect(stored).toEqual({ status: result.status, updated_at: result.updatedAt });
  });

  it("CA-19: rechazar En revisión devuelve En proceso y actualiza la fecha", async () => {
    const id = await fixture("review");
    const result = await transitionPackage(id, "review", "reject");
    expect(result.status).toBe("in_progress");
    expect(result.updatedAt.getTime()).toBeGreaterThan(Date.parse("2000-01-01T00:00:00Z"));
    expect(await persisted(id)).toEqual({ status: result.status, updated_at: result.updatedAt });
  });

  it("CA-21: persiste el ciclo de rechazo y avance hasta Listo", async () => {
    const id = await fixture("review");
    for (const [from, kind, to] of [
      ["review", "reject", "in_progress"],
      ["in_progress", "advance", "review"],
      ["review", "advance", "done"],
    ] as const) {
      expect((await transitionPackage(id, from, kind)).status).toBe(to);
      expect((await persisted(id)).status).toBe(to);
    }
  });

  it.each([
    ["CA-16", "done", "advance"],
    ["CA-20", "pending", "reject"],
    ["CA-20", "in_progress", "reject"],
    ["CA-20", "done", "reject"],
  ] as const)("%s: %s no admite %s ni toca la BD", async (_ca, status, kind) => {
    const id = await fixture(status);
    await expect(transitionPackage(id, status, kind)).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(queryLog).toHaveLength(0);
    expect(await persisted(id)).toEqual({ status, updated_at: new Date("2000-01-01T00:00:00Z") });
  });

  it("CA-18: expected obsoleto devuelve conflicto con el estado actual", async () => {
    const id = await fixture("in_progress");
    const action = transitionPackage(id, "pending", "advance");
    await expect(action).rejects.toBeInstanceOf(StatusConflictError);
    await expect(action).rejects.toMatchObject({ currentStatus: "in_progress" });
    expect((await persisted(id)).status).toBe("in_progress");
  });

  it("CA-17: un expected adelantado no permite saltar estados", async () => {
    const id = await fixture();
    await expect(transitionPackage(id, "review", "advance"))
      .rejects.toMatchObject({ name: "StatusConflictError", currentStatus: "pending" });
    expect((await persisted(id)).status).toBe("pending");
  });

  it("CA-18: distingue un paquete inexistente de un conflicto", async () => {
    await expect(transitionPackage("00000000-0000-4000-8000-000000000001", "pending", "advance"))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it("CA-18: dos avances realmente concurrentes producen un éxito y un conflicto", async () => {
    const id = await fixture();
    const results = await concurrentWrites("packages", () => [
      transitionPackage(id, "pending", "advance"), transitionPackage(id, "pending", "advance"),
    ]);
    const successes = results.filter((result) => result.status === "fulfilled");
    expect(successes).toHaveLength(1);
    expect(successes[0].value.status).toBe("in_progress");
    const failures = results.filter((result) => result.status === "rejected");
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toBeInstanceOf(StatusConflictError);
    expect(failures[0].reason.currentStatus).toBe("in_progress");
    expect((await persisted(id)).status).toBe("in_progress");
  });

  it("CA-18: el doble clic secuencial no avanza dos veces", async () => {
    const id = await fixture();
    await transitionPackage(id, "pending", "advance");
    await expect(transitionPackage(id, "pending", "advance")).rejects.toBeInstanceOf(StatusConflictError);
    expect((await persisted(id)).status).toBe("in_progress");
  });
});
