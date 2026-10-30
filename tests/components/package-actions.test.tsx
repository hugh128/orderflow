import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PackageRow } from "@/components/package-row";
import { OrderList } from "@/components/order-list";
import type { PackageStatus } from "@/lib/domain/types";
import { order } from "./fixtures";
import { renderWithQuery } from "./test-utils";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());
const pkg = { ...order.packages[0], sequence: 2 };
const row = (status: PackageStatus) => renderWithQuery(<ul><PackageRow pkg={{ ...pkg, status }} /></ul>);

describe("acciones de paquetes", () => {
  it.each([
    ["pending", "En proceso", false], ["in_progress", "Revisión", false], ["review", "Listo", true],
  ] as const)("CA-31: %s muestra Avanzar a %s y Rechazar=%s", (status, label, canReject) => {
    row(status);
    expect(screen.getByRole("button", { name: `Avanzar paquete 2 a ${label}` })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Rechazar paquete 2 a En proceso" }) !== null).toBe(canReject);
  });

  it("CA-31: Listo muestra Completado sin acciones", () => {
    row("done");
    expect(screen.getByText("Completado")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("T20: identifica el paquete y mantiene una región de anuncio antes de actuar", () => {
    row("review");
    const item = screen.getByRole("listitem", { name: "Paquete 2, Revisión" });
    expect(within(item).getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(within(item).getByRole("status")).toHaveAttribute("aria-atomic", "true");
    expect(within(item).getByRole("status")).toBeEmptyDOMElement();
    expect(within(item).getByText("Revisión")).toBeInTheDocument();
  });

  it("CA-19/CA-21: rechaza con expectedStatus de la pantalla", async () => {
    fetchMock.mockResolvedValue(Response.json({ package: { ...pkg, status: "in_progress" }, order }));
    const { client } = row("review");
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: "Rechazar paquete 2 a En proceso" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Paquete 2 pasó a En proceso"));
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/packages/${pkg.id}/reject`);
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ expectedStatus: "review" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["orders"] });
  });

  it("CA-32: doble clic produce un POST y bloquea solo ese paquete", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    renderWithQuery(<ul><PackageRow pkg={pkg} /><PackageRow pkg={{ ...pkg, id: "other", sequence: 3 }} /></ul>);
    const button = screen.getByRole("button", { name: "Avanzar paquete 2 a En proceso" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: "Avanzar paquete 3 a En proceso" })).toBeEnabled();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/packages/${pkg.id}/advance`);
    expect(options?.method).toBe("POST");
    expect(JSON.parse(options?.body as string)).toEqual({ expectedStatus: "pending" });
    await act(async () => resolve(Response.json({ package: { ...pkg, status: "in_progress" }, order })));
    await waitFor(() => expect(button).toBeEnabled());
    expect(within(screen.getByText("Paquete 2").closest("li")!).getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it.each([
    ["INVALID_TRANSITION", "La transición de estado no está permitida"],
    ["NETWORK_ERROR", "No se pudo conectar con el servidor"],
  ])("CA-33: %s informa y permite reintentar sincronización", async (code, message) => {
    if (code === "NETWORK_ERROR") fetchMock.mockRejectedValue(new TypeError("offline"));
    else fetchMock.mockResolvedValue(Response.json({ error: { code, message } }, { status: 409 }));
    const { client } = row("pending");
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: "Avanzar paquete 2 a En proceso" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(message));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["orders"] });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar sincronización del paquete 2" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("CA-32/CA-33: espera refetch y muestra datos reales, conflicto=%s", async (conflict) => {
    const initial = { ...order, packages: order.packages.map((item, index) => ({ ...item, status: index === 0 ? "review" as const : item.status })) };
    const updated = {
      ...initial, packages: initial.packages.map((item, index) => ({ ...item, status: index === 0 ? "done" as const : item.status })),
      summary: { ...order.summary, counts: { pending: 2, in_progress: 0, review: 0, done: 1 }, doneUnits: 100, percent: 40 },
    };
    let finishList!: (response: Response) => void;
    let finishDetail!: (response: Response) => void;
    let listCount = 0;
    let detailCount = 0;
    fetchMock.mockImplementation(async (url, options) => {
      if (options?.method === "POST") return conflict
        ? Response.json({ error: { code: "STATUS_CONFLICT", message: "El estado cambió", details: { currentStatus: "done" } } }, { status: 409 })
        : Response.json({ package: updated.packages[0], order: updated });
      if (url === "/api/orders") {
        if (++listCount === 1) return Response.json([initial]);
        return new Promise<Response>((resolve) => { finishList = resolve; });
      }
      if (++detailCount === 1) return Response.json(initial);
      return new Promise<Response>((resolve) => { finishDetail = resolve; });
    });
    renderWithQuery(<OrderList />);
    fireEvent.click(await screen.findByRole("button", { name: "Ver paquetes de A-1" }));
    const button = await screen.findByRole("button", { name: "Avanzar paquete 1 a Listo" });
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(listCount).toBe(2));
    await waitFor(() => expect(detailCount).toBe(2));
    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rechazar paquete 1 a En proceso" })).toBeDisabled();
    await act(async () => finishList(Response.json([updated])));
    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40"));
    expect(button).toBeDisabled();
    await act(async () => finishDetail(Response.json(updated)));
    await waitFor(() => expect(screen.getByText("Completado")).toBeInTheDocument());
    const firstRow = screen.getByText("Paquete 1").closest("li")!;
    expect(within(firstRow).getByText("Listo")).toBeInTheDocument();
    expect(within(firstRow).queryByRole("button", { name: /Avanzar/ })).not.toBeInTheDocument();
    await waitFor(() => expect(within(firstRow).getByRole("status")).toHaveTextContent(conflict
      ? "El paquete ya había cambiado de estado; se actualizó la vista"
      : "Paquete 1 pasó a Listo"));
    await waitFor(() => expect(firstRow).toHaveFocus());
  });
});
