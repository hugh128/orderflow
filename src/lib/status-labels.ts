import type { PackageStatus } from "./domain/types";

export const STATUS_LABELS: Record<PackageStatus, string> = {
  pending: "Pendiente", in_progress: "En proceso", review: "Revisión", done: "Listo",
};
