"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { PackageStatus } from "@/lib/domain/types";
import type { OrderDTO, PackageDTO } from "@/lib/dto";
import { orderKeys } from "./keys";

export function useTransition() {
  const client = useQueryClient();
  const synchronize = () => client.invalidateQueries({ queryKey: orderKeys.all });
  const mutation = useMutation({
    mutationFn: ({ id, expectedStatus, kind, reason }: { id: string; expectedStatus: PackageStatus; kind: "advance" | "reject"; reason?: string }) =>
      apiFetch<{ package: PackageDTO; order: OrderDTO }>(`/api/packages/${id}/${kind}`, { method: "POST", body: { expectedStatus, ...(kind === "reject" && { reason }) } }),
    onSuccess: () => synchronize(),
    onError: () => synchronize(),
  });
  const hasSynchronizationError = () => client.getQueryCache().findAll({ queryKey: orderKeys.all })
    .some((query) => query.isActive() && query.state.status === "error");
  return { ...mutation, synchronize, hasSynchronizationError };
}
