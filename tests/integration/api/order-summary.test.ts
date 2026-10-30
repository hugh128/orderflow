import { randomUUID } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import type { OrderHistorySnapshot } from "@/lib/ai/history-types";
const { summarize } = vi.hoisted(() => ({ summarize: vi.fn() }));
vi.mock("@/lib/ai/summarize-history", () => ({
  summarizeOrderHistory: summarize,
}));
import { POST } from "@/app/api/orders/[id]/summary/route";
import { createOrderWithPackages, transitionPackage } from "@/lib/db/repo";
import { queryLog, testSql as sql } from "../db";
import { AiUnavailableError } from "@/lib/ai/errors";
const call = (id: string) =>
  POST(new Request("http://localhost", { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
beforeEach(() => {
  summarize
    .mockReset()
    .mockImplementation(async (snapshot: OrderHistorySnapshot) => ({
      overview: "Resumen",
      highlights: snapshot.events,
      observedAt: snapshot.observedAt,
    }));
});
it("CA-49: valida identidad y existencia antes del modelo", async () => {
  queryLog.length = 0;
  expect((await call("abc")).status).toBe(400);
  expect(queryLog).toHaveLength(0);
  expect((await call(randomUUID())).status).toBe(404);
  expect(summarize).not.toHaveBeenCalled();
});
it("CA-49: lee resumen real, eventos del pedido y no modifica datos", async () => {
  const { order, packages } = await createOrderWithPackages({
    number: "S-1",
    customer: "Ejemplo",
    units: 250,
  });
  for (const status of ["pending", "in_progress", "review"] as const)
    await transitionPackage(packages[0].id, status, "advance");
  const response = await call(order.id);
  expect(response.status).toBe(200);
  const snapshot = summarize.mock.calls[0][0] as OrderHistorySnapshot;
  expect(snapshot.order.summary.percent).toBe(40);
  expect(snapshot.events).toHaveLength(3);
  expect(snapshot.events.every((e) => e.sequence === 1)).toBe(true);
  expect(
    (await sql`select count(*)::int as count from package_events`)[0].count,
  ).toBe(3);
});
it("CA-53: fallo del proveedor devuelve 503 seguro", async () => {
  const { order } = await createOrderWithPackages({
    number: "S-2",
    customer: "Ejemplo",
    units: 1,
  });
  summarize.mockRejectedValue(new AiUnavailableError());
  const response = await call(order.id);
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("AI_UNAVAILABLE");
});
