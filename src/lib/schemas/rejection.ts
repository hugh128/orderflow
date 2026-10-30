import { z } from "zod";

export const rejectionReasonSchema = z.string({ error: "Indica el motivo del rechazo" })
  .trim().min(1, { error: "Indica el motivo del rechazo" })
  .max(300, { error: "El motivo no puede superar 300 caracteres" });
