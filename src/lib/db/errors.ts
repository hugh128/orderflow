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
