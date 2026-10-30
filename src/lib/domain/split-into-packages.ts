import { MAX_ORDER_UNITS, MAX_PACKAGE_UNITS } from "./types";

export function splitIntoPackages(total: number): number[] {
  if (!Number.isInteger(total) || total < 1 || total > MAX_ORDER_UNITS) {
    throw new RangeError(`La cantidad debe ser un entero entre 1 y ${MAX_ORDER_UNITS}`);
  }

  return Array.from({ length: Math.ceil(total / MAX_PACKAGE_UNITS) }, (_, index) =>
    Math.min(MAX_PACKAGE_UNITS, total - index * MAX_PACKAGE_UNITS),
  );
}
