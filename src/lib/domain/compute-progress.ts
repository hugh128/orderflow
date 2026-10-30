import type { OrderSummary, PackageStatus } from "./types";

export function computeProgress(
  packages: readonly { units: number; status: PackageStatus }[],
): OrderSummary {
  const counts: Record<PackageStatus, number> = {
    pending: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };
  let totalUnits = 0;
  let doneUnits = 0;

  for (const pkg of packages) {
    counts[pkg.status]++;
    totalUnits += pkg.units;
    if (pkg.status === "done") doneUnits += pkg.units;
  }

  return {
    counts,
    totalPackages: packages.length,
    totalUnits,
    doneUnits,
    percent: totalUnits === 0 ? 0 : Math.floor((doneUnits * 100) / totalUnits),
  };
}
