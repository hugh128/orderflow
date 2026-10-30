import { z } from "zod";
import { PACKAGE_STATUSES } from "../domain/types";

export const packageTransitionSchema = z.object({
  expectedStatus: z.enum(PACKAGE_STATUSES, { error: "El estado esperado debe ser válido" }),
});
