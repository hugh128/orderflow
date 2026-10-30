import { afterEach, describe, expect, it, vi } from "vitest";
import { errorResponse, handleError } from "@/lib/api/errors";
import { DuplicateOrderNumberError, NotFoundError, StatusConflictError } from "@/lib/db/errors";
import { InvalidTransitionError } from "@/lib/domain/package-status";
import { createOrderSchema } from "@/lib/schemas/order";
import { AiRateLimitError, AiUnavailableError } from "@/lib/ai/errors";

afterEach(() => vi.restoreAllMocks());

describe("handleError", () => {
  it("CA-38: IA no disponible produce 503 sin detalles del proveedor", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleError(new AiUnavailableError());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "AI_UNAVAILABLE",
      message: "El asistente no está disponible; puedes crear el pedido manualmente" } });
    expect(log).not.toHaveBeenCalled();
  });

  it("CA-40: límite de IA produce 429 con Retry-After", async () => {
    const response = handleError(new AiRateLimitError(17));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("17");
    expect(await response.json()).toEqual({ error: { code: "AI_RATE_LIMITED",
      message: "Has alcanzado el límite de análisis; inténtalo de nuevo en un momento" } });
  });

  it("CA-07: ZodError real produce 400 con mensajes por campo", async () => {
    const parsed = createOrderSchema.safeParse({ number: "A-1", customer: "Sol", units: 0 });
    expect(parsed.success).toBe(false);
    const response = handleError(parsed.error);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: {
      code: "VALIDATION_ERROR", message: "Datos inválidos",
      details: { formErrors: [], fieldErrors: { units: ["La cantidad debe ser un número entero mayor que 0"] } },
    } });
  });

  it("CA-11: conserva los errores de número y cliente en sus propios campos", async () => {
    const parsed = createOrderSchema.safeParse({ number: " ", customer: "", units: 1 });
    expect(parsed.success).toBe(false);
    expect(await handleError(parsed.error).json()).toEqual({ error: {
      code: "VALIDATION_ERROR", message: "Datos inválidos",
      details: { formErrors: [], fieldErrors: {
        number: ["El número de pedido es obligatorio"], customer: ["El cliente es obligatorio"],
      } },
    } });
  });

  it("CA-07: conserva errores de formulario cuando no hay un objeto", async () => {
    const parsed = createOrderSchema.safeParse(null);
    expect(await handleError(parsed.error).json()).toEqual({ error: {
      code: "VALIDATION_ERROR", message: "Datos inválidos",
      details: { formErrors: ["Los datos del pedido deben ser un objeto"], fieldErrors: {} },
    } });
  });

  it("CA-09: número duplicado produce 409 DUPLICATE_ORDER_NUMBER", async () => {
    const response = handleError(new DuplicateOrderNumberError());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: {
      code: "DUPLICATE_ORDER_NUMBER", message: "El número de pedido ya existe",
    } });
  });

  it("CA-16: transición inválida produce 409 INVALID_TRANSITION", async () => {
    const response = handleError(new InvalidTransitionError());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: {
      code: "INVALID_TRANSITION", message: "La transición de estado no está permitida",
    } });
  });

  it("CA-18: conflicto produce 409 STATUS_CONFLICT con currentStatus", async () => {
    const response = handleError(new StatusConflictError("in_progress"));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: {
      code: "STATUS_CONFLICT", message: "El estado del paquete cambió; actualiza la información",
      details: { currentStatus: "in_progress" },
    } });
  });

  it("T12: recurso inexistente produce 404 NOT_FOUND", async () => {
    const response = handleError(new NotFoundError());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "El paquete no existe" } });
  });

  it.each([
    new Error("password authentication failed for user postgres"),
    "password authentication failed for user postgres",
    null,
    new Error("El número de pedido ya existe"),
  ])("T12: un error desconocido se registra y devuelve 500 genérico (%s)", async (error) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleError(error);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: { code: "INTERNAL", message: "Ocurrió un error interno" } });
    expect(JSON.stringify(body)).not.toContain("password authentication");
    expect(log).toHaveBeenCalledWith("Error interno de API", error);
  });
});

describe("errorResponse", () => {
  it("T12: omite details cuando no se proporciona y devuelve JSON", async () => {
    const response = errorResponse(400, "VALIDATION_ERROR", "Datos inválidos");
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: { code: "VALIDATION_ERROR", message: "Datos inválidos" } });
  });

  it("T12: incluye los detalles proporcionados", async () => {
    const response = errorResponse(409, "STATUS_CONFLICT", "El estado cambió", { currentStatus: "review" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: {
      code: "STATUS_CONFLICT", message: "El estado cambió", details: { currentStatus: "review" },
    } });
  });
});
