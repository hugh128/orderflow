"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { OrderDTO } from "@/lib/dto";
import { orderKeys } from "./keys";

export function useOrders() {
  return useQuery({ queryKey: orderKeys.all, queryFn: ({ signal }) => apiFetch<OrderDTO[]>("/api/orders", { signal }), retry: false });
}
