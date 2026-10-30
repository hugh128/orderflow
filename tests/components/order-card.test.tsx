import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderCard } from "@/components/order-card";
import { order } from "./fixtures";
import { renderWithQuery } from "./test-utils";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("OrderCard", () => {
  it.each([["CA-22", 40], ["CA-23", 20], ["CA-26", 33], ["CA-24", 100], ["CA-25", 0]])(
    "%s: muestra el avance %i recibido, sin recalcularlo", (_ca, percent) => {
      renderWithQuery(<OrderCard order={{ ...order, summary: { ...order.summary, percent: percent as number } }} />);
      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuenow", String(percent));
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
      expect(screen.getByText(`${percent} %`)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("CA-25: muestra los cuatro estados incluidos sus ceros", () => {
    renderWithQuery(<OrderCard order={order} />);
    for (const [label, count] of [["Pendiente", 3], ["En proceso", 0], ["Revisión", 0], ["Listo", 0]]) {
      const item = screen.getByText(label).closest("div")!;
      expect(within(item).getByText(String(count))).toBeInTheDocument();
    }
  });

  it("CA-30: no pide detalle colapsado; expandir muestra paquetes con unidades y estado", async () => {
    fetchMock.mockResolvedValue(Response.json(order));
    renderWithQuery(<OrderCard order={order} />);
    const button = screen.getByRole("button", { name: "Ver paquetes de A-1" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText("Paquete 1")).toBeInTheDocument();
    expect(screen.getByText("Paquete 2")).toBeInTheDocument();
    expect(screen.getByText("Paquete 3")).toBeInTheDocument();
    expect(screen.getByText("50 unidades")).toBeInTheDocument();
    expect(screen.getAllByText("Pendiente")).toHaveLength(4);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/orders/order-1");
    fireEvent.click(button);
    expect(screen.queryByText("Paquete 1")).not.toBeInTheDocument();
  });

  it("CA-30: error de detalle muestra reintento y recupera los paquetes", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(Response.json(order));
    renderWithQuery(<OrderCard order={order} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver paquetes de A-1" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar detalle" }));
    await waitFor(() => expect(screen.getByText("Paquete 1")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
