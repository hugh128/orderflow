export const PACKAGE_STATUSES = [
  "pending",
  "in_progress",
  "review",
  "done",
] as const;

export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export const MAX_PACKAGE_UNITS = 100;
export const MAX_ORDER_UNITS = 100_000;

export type OrderSummary = {
  counts: Record<PackageStatus, number>;
  totalPackages: number;
  totalUnits: number;
  doneUnits: number;
  percent: number;
};
