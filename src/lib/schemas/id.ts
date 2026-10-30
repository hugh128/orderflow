import { z } from "zod";

const idSchema = z.object({ id: z.uuid({ error: "El identificador debe ser un UUID válido" }) });

export function parseId(id: unknown): string {
  return idSchema.parse({ id }).id;
}
