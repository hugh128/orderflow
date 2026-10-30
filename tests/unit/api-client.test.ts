import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api/client";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("T16: apiFetch", () => {
  it("devuelve el JSON de una respuesta exitosa", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "A-1" }));
    expect(await apiFetch<{ id: string }>("/api/orders")).toEqual({ id: "A-1" });
  });

  it.each([
    [400, "VALIDATION_ERROR", { fieldErrors: { units: ["Cantidad inválida"] } }],
    [409, "STATUS_CONFLICT", { currentStatus: "in_progress" }],
  ])("conserva estado %i, código %s y detalles", async (status, code, details) => {
    fetchMock.mockResolvedValue(Response.json({ error: { code, message: "Datos inválidos", details } }, { status: status as number }));
    const result = apiFetch("/api/orders");
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ status, code, message: "Datos inválidos", details });
  });

  it.each(["<h1>Bad gateway</h1>", '{"otro":"error"}'])("maneja un error sin contrato JSON: %s", async (body) => {
    fetchMock.mockResolvedValue(new Response(body, { status: 502 }));
    await expect(apiFetch("/api/orders")).rejects.toMatchObject({ status: 502, code: "UNKNOWN_ERROR", message: "No se pudo completar la solicitud" });
  });

  it("convierte un fallo de red en NETWORK_ERROR en español", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/api/orders")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR", message: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo." });
  });

  it("serializa el cuerpo y conserva encabezados adicionales", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }, { status: 201 }));
    await apiFetch("/api/orders", { method: "POST", body: { units: 250 }, headers: { "x-request-id": "test" } });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(options?.method).toBe("POST");
    expect(options?.body).toBe('{"units":250}');
    expect(new Headers(options?.headers).get("content-type")).toBe("application/json");
    expect(new Headers(options?.headers).get("x-request-id")).toBe("test");
  });
});
