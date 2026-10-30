"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { OrderDetailDTO } from "@/lib/dto";
import { orderKeys } from "./keys";

export function useOrder(id: string, expanded: boolean) {
  return useQuery({
    queryKey: [...orderKeys.all, id], enabled: expanded, retry: false,
    queryFn: ({ signal }) => apiFetch<OrderDetailDTO>(`/api/orders/${id}`, { signal }),
  });
}
