import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiOrderBox } from "@/components/ai-order-box";
import { OrderForm } from "@/components/order-form";
import { renderWithQuery } from "./test-utils";
import { order } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();
const draft = { number: "A-1042", customer: "Textiles Sol", units: 250 };
beforeEach(() => {
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

async function analyze() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Asistente IA" }));
  await user.type(screen.getByLabelText("Describe el pedido con tus palabras (opcional)"), "Pedido A-1042 para Textiles Sol, 250 unidades");
  await user.click(screen.getByRole("button", { name: "Analizar" }));
  return user;
}

describe("T23.1: asistente flotante y aplicación de propuestas", () => {
  it("CA-34: rellena sin guardar y lleva el foco a Guardar para revisión", async () => {
    fetchMock.mockResolvedValue(Response.json({ draft, issues: [] }));
    renderWithQuery(<OrderForm />);
    const user = await analyze();
    await screen.findByRole("button", { name: "Usar estos datos" });
    expect(screen.getByLabelText("Cantidad de unidades")).toHaveValue("");
    expect(screen.getByRole("dialog", { name: "Asistente IA" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Usar estos datos" }));
    await waitFor(() => expect(screen.getByLabelText("Cantidad de unidades")).toHaveValue("250"));
    expect(screen.getByLabelText("Número de pedido")).toHaveValue("A-1042");
    expect(screen.getByLabelText("Cliente")).toHaveValue("Textiles Sol");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/orders/parse");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ text: "Pedido A-1042 para Textiles Sol, 250 unidades" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar pedido" })).toHaveFocus());
  });

  it("CA-35: conserva campos no detectados, muestra issues y enfoca el primer campo que falta", async () => {
    fetchMock.mockResolvedValue(Response.json({ draft: { units: 250 }, issues: [
      { field: "number", message: "No se detectó el número de pedido" },
      { field: "customer", message: "No se detectó el cliente" },
    ] }));
    renderWithQuery(<OrderForm />);
    await userEvent.type(screen.getByLabelText("Cliente"), "Cliente escrito a mano");
    const user = await analyze();
    expect(await screen.findByText("No se detectó el cliente")).toBeVisible();
    expect(screen.getByText("No se detectó el número de pedido")).toBeVisible();
    await user.click(await screen.findByRole("button", { name: "Usar estos datos" }));
    await waitFor(() => expect(screen.getByLabelText("Cantidad de unidades")).toHaveValue("250"));
    expect(screen.getByLabelText("Cliente")).toHaveValue("Cliente escrito a mano");
    await waitFor(() => expect(screen.getByLabelText("Número de pedido")).toHaveFocus());
    expect(screen.getByLabelText("Número de pedido")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("CA-34: aplicar dos veces la misma propuesta vuelve a rellenar el campo editado", async () => {
    fetchMock.mockImplementation(async () => Response.json({ draft, issues: [] }));
    renderWithQuery(<OrderForm />);
    const user = await analyze();
    await user.click(await screen.findByRole("button", { name: "Usar estos datos" }));
    await waitFor(() => expect(screen.getByLabelText("Número de pedido")).toHaveValue("A-1042"));
    await user.clear(screen.getByLabelText("Número de pedido"));
    await user.type(screen.getByLabelText("Número de pedido"), "EDITADO");
    await user.click(screen.getByRole("button", { name: "Asistente IA" }));
    await user.click(screen.getByRole("button", { name: "Analizar" }));
    await user.click(await screen.findByRole("button", { name: "Usar estos datos" }));
    await waitFor(() => expect(screen.getByLabelText("Número de pedido")).toHaveValue("A-1042"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([url]) => url === "/api/orders/parse")).toBe(true);
  });

  it("CA-36: etiqueta, contador y longitud máxima; vacío no se envía", async () => {
    renderWithQuery(<AiOrderBox onDraft={vi.fn()} />);
    const input = screen.getByLabelText("Describe el pedido con tus palabras (opcional)");
    expect(input).toHaveAttribute("maxlength", "500");
    expect(screen.getByText("0/500")).toBeVisible();
    expect(screen.getByRole("button", { name: "Analizar" })).toBeDisabled();
    fireEvent.change(input, { target: { value: " " } });
    expect(screen.getByRole("button", { name: "Analizar" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "x".repeat(501) } });
    expect(screen.getByRole("button", { name: "Analizar" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CA-34: bloqueo inmediato evita doble envío y termina al completar el análisis", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    const apply = vi.fn();
    renderWithQuery(<AiOrderBox onDraft={apply} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Pedido de prueba" } });
    const button = screen.getByRole("button", { name: "Analizar" });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Analizando…" })).toBeDisabled();
    await act(async () => resolve(Response.json({ draft, issues: [] })));
    await waitFor(() => expect(screen.getByRole("button", { name: "Analizar" })).toBeEnabled());
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Usar estos datos" }));
    await waitFor(() => expect(apply).toHaveBeenCalledExactlyOnceWith(draft));
  });

  it.each([
    [429, "AI_RATE_LIMITED", "Has alcanzado el límite de análisis"],
    [503, "AI_UNAVAILABLE", "El asistente no está disponible"],
    [0, "NETWORK_ERROR", "No se pudo conectar con el servidor"],
  ])("CA-38: error %s se anuncia y el formulario manual sigue permitiendo guardar", async (status, code, message) => {
    fetchMock.mockImplementation(async (url) => {
      if (url === "/api/orders") return Response.json(order, { status: 201 });
      if (status === 0) throw new TypeError("sin red");
      return Response.json({ error: { code, message } }, { status });
    });
    renderWithQuery(<OrderForm />);
    const user = await analyze();
    const error = await screen.findByText(new RegExp(message));
    expect(error.closest('[aria-live="polite"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analizar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Cerrar asistente" }));
    await user.type(screen.getByLabelText("Número de pedido"), "A-1");
    await user.type(screen.getByLabelText("Cliente"), "Cliente manual");
    await user.type(screen.getByLabelText("Cantidad de unidades"), "250");
    await user.click(screen.getByRole("button", { name: "Guardar pedido" }));
    expect(await screen.findByText("Pedido A-1 creado con 3 paquetes")).toBeVisible();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/orders")).toHaveLength(1);
  });

  it("CA-34 RNF-03: abre con foco, cierra y conserva el texto para volver a analizar", async () => {
    renderWithQuery(<OrderForm />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const user = userEvent.setup();
    const launcher = screen.getByRole("button", { name: "Asistente IA" });
    expect(launcher).toHaveAttribute("aria-haspopup", "dialog");
    await user.click(launcher);
    expect(screen.getByRole("textbox", { name: /Describe el pedido/ })).toHaveFocus();
    await user.type(screen.getByRole("textbox", { name: /Describe el pedido/ }), "Pedido pendiente de analizar");
    await user.click(screen.getByRole("button", { name: "Cerrar asistente" }));
    expect(launcher).toHaveFocus();
    await user.click(launcher);
    expect(screen.getByRole("textbox", { name: /Describe el pedido/ })).toHaveValue("Pedido pendiente de analizar");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CA-34: cerrar mientras analiza no modifica el formulario ni roba el foco", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
    renderWithQuery(<OrderForm />);
    const user = await analyze();
    await user.click(screen.getByRole("button", { name: "Cerrar asistente" }));
    await act(async () => resolve(Response.json({ draft, issues: [] })));
    expect(screen.getByLabelText("Número de pedido")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Asistente IA" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Asistente IA" }));
    expect(screen.getByRole("button", { name: "Usar estos datos" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
