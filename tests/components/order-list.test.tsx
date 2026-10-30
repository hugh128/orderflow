import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderList } from "@/components/order-list";
import { order } from "./fixtures";
import { renderWithQuery } from "./test-utils";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("OrderList", () => {
  it("CA-29: muestra carga con aria-busy", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<OrderList />);
    expect(screen.getByRole("region", { name: "Pedidos" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Cargando pedidos…")).toBeInTheDocument();
  });

  it("CA-29: lista vacía muestra un mensaje útil", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    renderWithQuery(<OrderList />);
    expect(await screen.findByText("Aún no hay pedidos")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Pedidos" })).toHaveAttribute("aria-busy", "false");
  });

  it("CA-29: mantiene el orden recibido y no pide detalles", async () => {
    fetchMock.mockResolvedValue(Response.json([{ ...order, id: "new", number: "NUEVO" }, { ...order, id: "old", number: "ANTIGUO" }]));
    renderWithQuery(<OrderList />);
    await screen.findByText("NUEVO");
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["NUEVO", "ANTIGUO"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/orders");
  });

  it("CA-29: error con Reintentar vuelve a pedir y recupera la lista", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Bad gateway", { status: 502 })).mockResolvedValueOnce(Response.json([order]));
    renderWithQuery(<OrderList />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la solicitud");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByText("A-1")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
