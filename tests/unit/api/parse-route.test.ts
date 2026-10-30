import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParseOrderResult } from "@/lib/ai/parse-order";
import { AiUnavailableError } from "@/lib/ai/errors";

const { parse } = vi.hoisted(() => ({ parse: vi.fn<(text: string) => Promise<ParseOrderResult>>() }));
vi.mock("@/lib/ai/parse-order", () => ({ parseOrderFromText: parse }));
// Una importación accidental de persistencia debe hacer fallar esta suite.
vi.mock("@/lib/db/client", () => { throw new Error("T22 no debe importar el cliente de BD"); });
import { POST, runtime, dynamic, maxDuration } from "@/app/api/orders/parse/route";

const proposal: ParseOrderResult = {
  draft: { number: "A-1042", customer: "Textiles Sol", units: 250 }, issues: [],
};
let time = 0;
beforeEach(() => {
  time += 120_000;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(time);
  parse.mockReset().mockResolvedValue(proposal);
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("TEST_DATABASE_URL", "");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "dummy-secret-not-for-output");
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function request(body: unknown = { text: "Pedido A-1042 para Textiles Sol, 250 unidades" }, headers: HeadersInit = { "x-real-ip": "203.0.113.1" }) {
  return new Request("http://localhost/api/orders/parse", {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
  });
}

describe("T22: POST /api/orders/parse", () => {
  it("CA-37: usa runtime de servidor y configuración de ruta dinámica", () => {
    expect(runtime).toBe("nodejs");
    expect(dynamic).toBe("force-dynamic");
    expect(maxDuration).toBe(30);
  });

  it.each([undefined, null, "", "   ", "x".repeat(501), 123, [], {}])(
    "CA-36: texto inválido %j devuelve 400 antes de llamar al parser", async (text) => {
      const response = await POST(request({ text }));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR",
        details: { fieldErrors: { text: expect.arrayContaining([expect.any(String)]) } } } });
      expect(parse).not.toHaveBeenCalled();
    },
  );

  it("CA-34 CA-36: acepta 500 caracteres, recorta espacios y devuelve la propuesta", async () => {
    const text = "x".repeat(500);
    const response = await POST(request({ text: `  ${text}  `, status: "done" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(proposal);
    expect(parse).toHaveBeenCalledExactlyOnceWith(text);
  });

  it.each(["", "{", "null", "[]", '"texto"'])("CA-36: cuerpo no válido %j devuelve INVALID_JSON", async (body) => {
    const response = await POST(new Request("http://localhost/api/orders/parse", { method: "POST", body }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_JSON" } });
    expect(parse).not.toHaveBeenCalled();
  });

  it("CA-36 CA-40: entradas inválidas no consumen cuota", async () => {
    for (let i = 0; i < 11; i++) expect((await POST(request({ text: " " }))).status).toBe(400);
    for (let i = 0; i < 10; i++) expect((await POST(request())).status).toBe(200);
    expect(parse).toHaveBeenCalledTimes(10);
  });

  it("CA-40: la undécima solicitud devuelve 429 sin llamar al parser; otra IP y el siguiente minuto funcionan", async () => {
    for (let i = 0; i < 10; i++) expect((await POST(request())).status).toBe(200);
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({ error: { code: "AI_RATE_LIMITED",
      message: "Has alcanzado el límite de análisis; inténtalo de nuevo en un momento" } });
    expect(parse).toHaveBeenCalledTimes(10);
    expect((await POST(request(undefined, { "x-real-ip": "203.0.113.2" }))).status).toBe(200);
    vi.setSystemTime(time + 60_000);
    expect((await POST(request())).status).toBe(200);
  });

  it("CA-40: solicitudes simultáneas no superan diez llamadas al parser", async () => {
    const responses = await Promise.all(Array.from({ length: 11 }, () => POST(request())));
    expect(responses.filter(({ status }) => status === 200)).toHaveLength(10);
    expect(responses.filter(({ status }) => status === 429)).toHaveLength(1);
    expect(parse).toHaveBeenCalledTimes(10);
  });

  it.each([
    [{ "x-real-ip": "203.0.113.3", "x-forwarded-for": "203.0.113.4" }, { "x-real-ip": "203.0.113.3", "x-forwarded-for": "203.0.113.5" }],
    [{ "x-forwarded-for": "203.0.113.6, 203.0.113.7" }, { "x-forwarded-for": "203.0.113.6, 203.0.113.8" }],
    [{}, { "x-real-ip": " ", "x-forwarded-for": " " }],
  ])("CA-40: respeta prioridad de IP, primera entrada y fallback unknown (%j)", async (first, second) => {
    for (let i = 0; i < 10; i++) await POST(request(undefined, first));
    expect((await POST(request(undefined, second))).status).toBe(429);
    expect(parse).toHaveBeenCalledTimes(10);
  });

  it("CA-38: fallo de IA devuelve 503 amable sin filtrar secretos ni registrar datos", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    parse.mockRejectedValue(new AiUnavailableError());
    const response = await POST(request());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ error: { code: "AI_UNAVAILABLE",
      message: "El asistente no está disponible; puedes crear el pedido manualmente" } });
    expect(JSON.stringify(body)).not.toContain("dummy-secret");
    expect(JSON.stringify(body)).not.toContain("Textiles Sol");
    expect(log).not.toHaveBeenCalled();
  });

  it("CA-35: devuelve la propuesta parcial y sus issues sin modificarlos", async () => {
    const partial: ParseOrderResult = { draft: { units: 250 }, issues: [{ field: "number", message: "No se detectó el número de pedido" }] };
    parse.mockResolvedValue(partial);
    expect(await (await POST(request())).json()).toEqual(partial);
  });
});
