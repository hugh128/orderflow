import type { OrderDetailDTO } from "@/lib/dto";

export const order: OrderDetailDTO = {
  id: "order-1", number: "A-1", customer: "Textiles Sol", totalUnits: 250, createdAt: "2026-01-01T00:00:00.000Z",
  summary: { counts: { pending: 3, in_progress: 0, review: 0, done: 0 }, totalPackages: 3, totalUnits: 250, doneUnits: 0, percent: 0 },
  packages: [100, 100, 50].map((units, index) => ({ id: `package-${index}`, sequence: index + 1, units, status: "pending", updatedAt: "2026-01-01T00:00:00.000Z" })),
};
