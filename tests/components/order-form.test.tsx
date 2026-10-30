import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrderForm } from "@/components/order-form";
import { renderWithQuery } from "./test-utils";
import { order } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

async function fill(units = "250", number = "A-1", customer = "Textiles Sol") {
  const user = userEvent.setup();
  if (number) await user.type(screen.getByLabelText("Número de pedido"), number);
  if (customer) await user.type(screen.getByLabelText("Cliente"), customer);
  if (units) await user.type(screen.getByLabelText("Cantidad de unidades"), units);
  return user;
}

describe("OrderForm", () => {
  it.each(["0", "10.5", "abc", "1e2"])("CA-07: rechaza cantidad %s con error asociado sin fetch", async (units) => {
    renderWithQuery(<OrderForm />);
    const user = await fill(units);
    await user.click(screen.getByRole("button", { name: "Guardar pedido" }));
    const input = screen.getByLabelText("Cantidad de unidades");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("La cantidad debe ser un número entero mayor que 0");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CA-08: muestra el máximo bajo la cantidad", async () => {
    renderWithQuery(<OrderForm />);
    const user = await fill("100001");
    await user.click(screen.getByRole("button", { name: "Guardar pedido" }));
    expect(screen.getByLabelText("Cantidad de unidades")).toHaveAccessibleDescription("La cantidad no puede superar 100 000 unidades");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([["Número de pedido", "", "Sol"], ["Número de pedido", "   ", "Sol"], ["Cliente", "A-1", ""], ["Cliente", "A-1", "   "]])(
    "CA-11: valida %s vacío o con espacios", async (field, number, customer) => {
      renderWithQuery(<OrderForm />);
      const user = await fill("250", number, customer);
      await user.click(screen.getByRole("button", { name: "Guardar pedido" }));
      expect(screen.getByLabelText(field)).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText(field)).toHaveAccessibleDescription(/obligatorio/);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("CA-09: sitúa el duplicado bajo el número y lo limpia al editar", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { code: "DUPLICATE_ORDER_NUMBER", message: "El número de pedido ya existe" } }, { status: 409 }));
    renderWithQuery(<OrderForm />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Guardar pedido" }));
    await waitFor(() => expect(screen.getByLabelText("Número de pedido")).toHaveAccessibleDescription("El número de pedido ya existe"));
    expect(screen.getByLabelText("Número de pedido")).toHaveAttribute("aria-invalid", "true");
    await user.type(screen.getByLabelText("Número de pedido"), "2");
    expect(screen.queryByText("El número de pedido ya existe")).not.toBeInTheDocument();
  });

  it("CA-07: sitúa fieldErrors del servidor bajo el campo correcto y permite corregirlos", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: { fieldErrors: { customer: ["Revisa el cliente"] } } } }, { status: 400 }));
    renderWithQuery(<OrderForm />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Guardar pedido" }));
    await waitFor(() => expect(screen.getByLabelText("Cliente")).toHaveAccessibleDescription("Revisa el cliente"));
    await user.type(screen.getByLabelText("Cliente"), "2");
    expect(screen.queryByText("Revisa el cliente")).not.toBeInTheDocument();
  });

  it("T17: payload numérico y recortado; bloquea doble envío, limpia e invalida pedidos", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    const { client } = renderWithQuery(<OrderForm />);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await fill("250", " A-1 ", " Textiles Sol ");
    const form = screen.getByRole("form", { name: "Crear pedido" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(options?.body as string)).toEqual({ number: "A-1", customer: "Textiles Sol", units: 250 });
    await act(async () => resolve(Response.json(order, { status: 201 })));
    await waitFor(() => expect(screen.getByLabelText("Número de pedido")).toHaveValue(""));
    expect(screen.getByLabelText("Cliente")).toHaveValue("");
    expect(screen.getByLabelText("Cantidad de unidades")).toHaveValue("");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["orders"] });
    expect(screen.getByRole("status")).toHaveTextContent("Pedido creado correctamente");
  });

  it("T17: un fallo de red conserva los datos y muestra un mensaje en español", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderWithQuery(<OrderForm />);
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Guardar pedido" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
    expect(screen.getByLabelText("Número de pedido")).toHaveValue("A-1");
  });
});
