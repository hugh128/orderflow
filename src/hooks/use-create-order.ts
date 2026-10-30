"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import type { OrderDetailDTO } from "@/lib/dto";
import type { createOrderSchema } from "@/lib/schemas/order";
import { orderKeys } from "./keys";

export function useCreateOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: z.output<typeof createOrderSchema>) => apiFetch<OrderDetailDTO>("/api/orders", { method: "POST", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
