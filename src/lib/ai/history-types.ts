import type { OrderDTO, PackageEventDTO } from "../dto";

export type OrderHistorySnapshot = {
  order: OrderDTO;
  events: (PackageEventDTO & { sequence: number })[];
  observedAt: string;
};
export type OrderHistorySummary = {
  orderNumber: string;
  overview: string;
  highlights: OrderHistorySnapshot["events"];
  observedAt: string;
  scope: string;
};
