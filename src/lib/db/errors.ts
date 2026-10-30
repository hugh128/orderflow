import type { PackageStatus } from "../domain/types";

function matchesOrderNumberConstraint(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return "code" in error && error.code === "23505" && (
    ("constraint_name" in error && error.constraint_name === "orders_number_unique_ci") ||
    ("constraint" in error && error.constraint === "orders_number_unique_ci")
  );
}

export function isUniqueViolation(error: unknown): boolean {
  return matchesOrderNumberConstraint(error) || (
    typeof error === "object" && error !== null &&
    "cause" in error && matchesOrderNumberConstraint(error.cause)
  );
}

export class DuplicateOrderNumberError extends Error {
  constructor() {
    super("El número de pedido ya existe");
    this.name = "DuplicateOrderNumberError";
  }
}


export class StatusConflictError extends Error {
  constructor(public readonly currentStatus: PackageStatus) {
    super("El estado del paquete cambió; actualiza la información");
    this.name = "StatusConflictError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("El paquete no existe");
    this.name = "NotFoundError";
  }
}
