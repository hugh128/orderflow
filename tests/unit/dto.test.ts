import { describe, expect, it } from "vitest";
import { toOrderDetailDTO, toOrderDTO, toPackageDTO } from "@/lib/dto";

const summary = {
  counts: { pending: 0, in_progress: 0, review: 0, done: 1 },
  totalPackages: 1, totalUnits: 100, doneUnits: 100, percent: 100,
};
const date = new Date("2026-01-02T03:04:05.123Z");
const order = { id: "order-id", number: "A-1", customer: "Sol", totalUnits: 100, createdAt: date, summary };
const pkg = { id: "package-id", orderId: order.id, sequence: 1, units: 100, status: "done" as const, updatedAt: date };

describe("DTO: contrato de API del plan §6", () => {
  it("CA-27: convierte el paquete a campos públicos y fecha ISO sin mutarlo", () => {
    expect(toPackageDTO(pkg)).toEqual({ id: pkg.id, sequence: 1, units: 100, status: "done", updatedAt: date.toISOString() });
    expect(pkg.updatedAt).toBe(date);
  });

  it("CA-29: OrderDTO conserva el resumen y no incluye paquetes", () => {
    const detail = { ...order, packages: [pkg] };
    const result = toOrderDTO(detail);
    expect(result).toEqual({ id: order.id, number: "A-1", customer: "Sol", totalUnits: 100, createdAt: date.toISOString(), summary });
    expect(order.createdAt).toBe(date);
  });

  it("CA-29: OrderDetailDTO incluye paquetes mapeados y conserva el resumen", () => {
    expect(toOrderDetailDTO({ ...order, packages: [pkg] })).toEqual({
      ...toOrderDTO(order), packages: [toPackageDTO(pkg)],
    });
  });
});
