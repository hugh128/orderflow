import { z } from "zod";
import { PACKAGE_STATUSES } from "../domain/types";
import { rejectionReasonSchema } from "./rejection";

export const packageTransitionSchema = z.object({
  expectedStatus: z.enum(PACKAGE_STATUSES, { error: "El estado esperado debe ser válido" }),
});

export const packageRejectionSchema = packageTransitionSchema.extend({ reason: rejectionReasonSchema });
