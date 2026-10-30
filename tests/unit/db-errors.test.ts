import { describe, expect, it } from "vitest";
import { DuplicateOrderNumberError, isUniqueViolation } from "@/lib/db/errors";

describe("isUniqueViolation", () => {
  it.each([
    { code: "23505", constraint_name: "orders_number_unique_ci" },
    { cause: { code: "23505", constraint_name: "orders_number_unique_ci" } },
    { code: "23505", constraint: "orders_number_unique_ci" },
  ])("CA-09: reconoce la unicidad del número directa o envuelta (%#)", (error) => {
    expect(isUniqueViolation(error)).toBe(true);
  });

  it.each([
    null, undefined, "23505", {},
    { code: "23514", constraint_name: "orders_number_unique_ci" },
    { code: "23505", constraint_name: "packages_order_sequence_unique" },
    { cause: { code: "23505", constraint_name: "packages_order_sequence_unique" } },
    { code: "23505" },
  ])("CA-09: no confunde otros errores o constraints (%#)", (error) => {
    expect(isUniqueViolation(error)).toBe(false);
  });

  it("CA-09: conserva el mensaje requerido", () => {
    expect(new DuplicateOrderNumberError()).toMatchObject({
      name: "DuplicateOrderNumberError", message: "El número de pedido ya existe",
    });
  });
});
