import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("API sin conexión configurada", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("T13-T15: importar rutas sin secretos funciona y consultar devuelve 500 genérico", async () => {
    const { GET } = await import("@/app/api/orders/route");
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: "INTERNAL", message: "Ocurrió un error interno" } });
    expect(console.error).toHaveBeenCalledWith("Error interno de API", expect.objectContaining({ message: expect.stringContaining("DATABASE_URL es obligatoria") }));
  });

  it("CA-12: la validación sigue devolviendo 400 antes de necesitar la BD", async () => {
    const { POST } = await import("@/app/api/orders/route");
    const response = await POST(new Request("http://localhost/api/orders", {
      method: "POST", body: JSON.stringify({ number: "A-1", customer: "Sol", units: 0 }),
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(console.error).not.toHaveBeenCalled();
  });
});
