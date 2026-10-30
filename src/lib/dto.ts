import type { orders, packages, packageEvents } from "./db/schema";
import type { OrderSummary, PackageStatus } from "./domain/types";

export type PackageDTO = {
  id: string;
  sequence: number;
  units: number;
  status: PackageStatus;
  updatedAt: string;
};

export type OrderDTO = {
  id: string;
  number: string;
  customer: string;
  totalUnits: number;
  createdAt: string;
  summary: OrderSummary;
};

export type OrderDetailDTO = OrderDTO & { packages: PackageDTO[] };

export type PackageEventDTO = {
  id: number; fromStatus: PackageStatus; toStatus: PackageStatus;
  kind: "advance" | "reject"; reason: string | null; createdAt: string;
};

export function toPackageEventDTO(event: typeof packageEvents.$inferSelect): PackageEventDTO {
  return { id: event.id, fromStatus: event.fromStatus, toStatus: event.toStatus,
    kind: event.kind, reason: event.reason, createdAt: event.createdAt.toISOString() };
}

type OrderWithSummary = typeof orders.$inferSelect & { summary: OrderSummary };
type PackageRow = typeof packages.$inferSelect;

export function toPackageDTO(pkg: PackageRow): PackageDTO {
  return {
    id: pkg.id, sequence: pkg.sequence, units: pkg.units,
    status: pkg.status, updatedAt: pkg.updatedAt.toISOString(),
  };
}

export function toOrderDTO(order: OrderWithSummary): OrderDTO {
  return {
    id: order.id, number: order.number, customer: order.customer,
    totalUnits: order.totalUnits, createdAt: order.createdAt.toISOString(), summary: order.summary,
  };
}

export function toOrderDetailDTO(order: OrderWithSummary & { packages: PackageRow[] }): OrderDetailDTO {
  return { ...toOrderDTO(order), packages: order.packages.map(toPackageDTO) };
}
