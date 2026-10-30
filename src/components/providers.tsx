"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: true }, mutations: { retry: false } },
  }));
  return <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem
    storageKey="orderflow-theme" disableTransitionOnChange>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </ThemeProvider>;
}
