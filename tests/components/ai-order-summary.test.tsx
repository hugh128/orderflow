import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AiOrderSummary } from "@/components/ai-order-summary";
import { renderWithQuery } from "./test-utils";
import { order } from "./fixtures";
afterEach(() => vi.unstubAllGlobals());
it("CA-48: selecciona pedido, muestra hechos y no llama a creación ni transición", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(async (url: string) =>
      url === "/api/orders"
        ? Response.json([order])
        : Response.json({
            orderNumber: order.number,
            overview: "40 % de avance",
            observedAt: "2026-10-30T00:00:00Z",
            scope: "Últimos 50 movimientos",
            highlights: [
              {
                id: 1,
                sequence: 2,
                fromStatus: "review",
                toStatus: "in_progress",
                kind: "reject",
                reason: "Revisar acabado",
                createdAt: "2026-10-30T00:00:00Z",
              },
            ],
          }),
    );
  vi.stubGlobal("fetch", fetch);
  renderWithQuery(<AiOrderSummary active />);
  await screen.findByRole("option", { name: new RegExp(order.number) });
  fireEvent.change(screen.getByLabelText("Pedido a resumir"), {
    target: { value: order.id },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));
  expect(await screen.findByText("40 % de avance")).toBeVisible();
  expect(screen.getByText("Revisar acabado")).toBeVisible();
  expect(
    fetch.mock.calls.some(([url]) => url === `/api/orders/${order.id}/summary`),
  ).toBe(true);
  expect(
    fetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});
it("CA-48: modo inactivo no consulta pedidos", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  renderWithQuery(<AiOrderSummary active={false} />);
  expect(fetch).not.toHaveBeenCalled();
});
it("CA-53: error de IA permite reintentar sin alterar pedido", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async (url: string) =>
        url === "/api/orders"
          ? Response.json([order])
          : Response.json(
              {
                error: {
                  code: "AI_UNAVAILABLE",
                  message: "El asistente no está disponible",
                },
              },
              { status: 503 },
            ),
      ),
  );
  renderWithQuery(<AiOrderSummary active />);
  await screen.findByRole("option", { name: new RegExp(order.number) });
  fireEvent.change(screen.getByLabelText("Pedido a resumir"), {
    target: { value: order.id },
  });
  fireEvent.click(screen.getByRole("button", { name: "Generar resumen" }));
  expect(
    await screen.findByText("El asistente no está disponible"),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Generar resumen" })).toBeEnabled();
});
