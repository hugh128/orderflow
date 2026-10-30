import { describe, expect, it } from "vitest";
import { createOrderSchema } from "@/lib/schemas/order";

const validOrder = { number: "A-1", customer: "Textiles Sol", units: 250 };
const invalidUnitsMessage = "La cantidad debe ser un número entero mayor que 0";
const maxUnitsMessage = "La cantidad no puede superar 100 000 unidades";

describe("createOrderSchema", () => {
  it.each([
    0, -5, 10.5, "", "  ", "abc", "1e2", "-5", "10.5",
    null, undefined, NaN, Infinity, -Infinity, true, [], {},
  ])("CA-07: rechaza units=%j e identifica el campo en español", (units) => {
    const result = createOrderSchema.safeParse({ ...validOrder, units });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ["units"], message: invalidUnitsMessage }),
      );
    }
  });

  it.each([100_001, "100001", "99999999999999999999"])(
    "CA-08: rechaza units=%j por exceder el máximo",
    (units) => {
      const result = createOrderSchema.safeParse({ ...validOrder, units });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({ path: ["units"], message: maxUnitsMessage }),
        );
      }
    },
  );

  it.each([
    ["number", "", "El número de pedido es obligatorio"],
    ["number", "   ", "El número de pedido es obligatorio"],
    ["number", "x".repeat(31), "El número de pedido no puede superar 30 caracteres"],
    ["number", null, "El número de pedido debe ser texto"],
    ["customer", "", "El cliente es obligatorio"],
    ["customer", "   ", "El cliente es obligatorio"],
    ["customer", "x".repeat(101), "El cliente no puede superar 100 caracteres"],
    ["customer", undefined, "El cliente debe ser texto"],
  ] as const)("CA-11: valida %s=%j con mensaje %s", (field, value, message) => {
    const result = createOrderSchema.safeParse({ ...validOrder, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: [field], message }),
      );
    }
  });

  it.each([[1, 1], ["250", 250], [" 250 ", 250], [100_000, 100_000], ["007", 7]])(
    "CA-07: acepta units=%j y devuelve %i",
    (units, expected) => {
      // Los ceros iniciales son válidos: "007" representa siete unidades.
      expect(createOrderSchema.parse({ ...validOrder, units }).units).toBe(expected);
    },
  );

  it("CA-11: recorta ambos textos y acepta sus longitudes máximas", () => {
    expect(createOrderSchema.parse({ number: ` ${"n".repeat(30)} `, customer: ` ${"c".repeat(100)} `, units: 1 }))
      .toEqual({ number: "n".repeat(30), customer: "c".repeat(100), units: 1 });
  });
});
