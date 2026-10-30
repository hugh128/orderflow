"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ParseOrderResult } from "@/lib/ai/parse-order";

export function useParseOrder() {
  return useMutation({
    mutationFn: (text: string) => apiFetch<ParseOrderResult>("/api/orders/parse", {
      method: "POST", body: { text },
    }),
    retry: false,
  });
}
