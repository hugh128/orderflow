import { z } from "zod";
import { MAX_ORDER_UNITS } from "../domain/types";

const invalidUnitsMessage = "La cantidad debe ser un número entero mayor que 0";

const unitsSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
  },
  z.number({ error: invalidUnitsMessage })
    .min(1, { error: invalidUnitsMessage })
    .max(MAX_ORDER_UNITS, { error: "La cantidad no puede superar 100 000 unidades" })
    .int({ error: invalidUnitsMessage }),
);

export const createOrderSchema = z.object({
  number: z.string({ error: "El número de pedido debe ser texto" })
    .trim()
    .min(1, { error: "El número de pedido es obligatorio" })
    .max(30, { error: "El número de pedido no puede superar 30 caracteres" }),
  customer: z.string({ error: "El cliente debe ser texto" })
    .trim()
    .min(1, { error: "El cliente es obligatorio" })
    .max(100, { error: "El cliente no puede superar 100 caracteres" }),
  units: unitsSchema,
}, { error: "Los datos del pedido deben ser un objeto" });
