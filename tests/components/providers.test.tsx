import { useEffect } from "react";
import { render } from "@testing-library/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";

function Probe({ capture }: { capture: (client: QueryClient) => void }) {
  const client = useQueryClient();
  useEffect(() => capture(client), [capture, client]);
  return <span>Proveedor listo</span>;
}

it("T16: cada proveedor tiene su cliente estable y opciones de consulta y mutación", () => {
  const capture = vi.fn();
  const other = vi.fn();
  const { rerender } = render(<Providers><Probe capture={capture} /></Providers>);
  const client = capture.mock.calls[0][0] as QueryClient;
  rerender(<Providers><Probe capture={capture} /></Providers>);
  expect(capture).toHaveBeenCalledTimes(1);
  render(<Providers><Probe capture={other} /></Providers>);
  expect(other.mock.calls[0][0]).not.toBe(client);
  expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
});
