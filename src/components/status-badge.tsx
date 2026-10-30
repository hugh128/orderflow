import type { PackageStatus } from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/status-labels";

export function StatusBadge({ status }: { status: PackageStatus }) {
  return <span className={`status-badge ${status}`}><span className="status-dot" aria-hidden="true" />{STATUS_LABELS[status]}</span>;
}
