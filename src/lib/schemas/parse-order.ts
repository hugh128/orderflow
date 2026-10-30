import { z } from "zod";

export const parseOrderTextSchema = z.object({
  text: z.string({ error: "Describe el pedido con texto" })
    .trim()
    .min(1, { error: "Escribe una descripción del pedido" })
    .max(500, { error: "La descripción no puede superar 500 caracteres" }),
});
