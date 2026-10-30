import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orderflow | Seguimiento de pedidos",
  description: "Registro de pedidos y seguimiento de su avance por paquetes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
