import type { PackageDTO } from "@/lib/dto";
import { StatusBadge } from "./status-badge";

export function PackageRow({ pkg }: { pkg: PackageDTO }) {
  return <li className="package-row">
    <span className="package-sequence">Paquete {pkg.sequence}</span>
    <span className="muted">{pkg.units} unidades</span>
    <StatusBadge status={pkg.status} />
  </li>;
}
