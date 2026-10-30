import { PACKAGE_STATUSES, type OrderSummary } from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/status-labels";

export function StatusCounts({ counts }: { counts: OrderSummary["counts"] }) {
  return <dl className="status-counts" aria-label="Paquetes por estado">
    {PACKAGE_STATUSES.map((status) => <div key={status} className={`count-item ${status}`}>
      <dt><span className="status-dot" aria-hidden="true" />{STATUS_LABELS[status]}</dt>
      <dd>{counts[status]}</dd>
    </div>)}
  </dl>;
}
