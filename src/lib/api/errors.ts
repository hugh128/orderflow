import { z } from "zod";
import { DuplicateOrderNumberError, NotFoundError, StatusConflictError } from "../db/errors";
import { InvalidTransitionError } from "../domain/package-status";
import { InvalidJsonError } from "./read-json";
import { AiRateLimitError, AiUnavailableError } from "../ai/errors";

export function errorResponse(status: number, code: string, message: string, details?: unknown): Response {
  return Response.json({
    error: { code, message, ...(details === undefined ? {} : { details }) },
  }, { status });
}

export function handleError(error: unknown): Response {
  if (error instanceof AiUnavailableError) {
    return errorResponse(503, "AI_UNAVAILABLE", error.message);
  }
  if (error instanceof AiRateLimitError) {
    const response = errorResponse(429, "AI_RATE_LIMITED", error.message);
    response.headers.set("Retry-After", String(error.retryAfter));
    return response;
  }
  if (error instanceof InvalidJsonError) {
    return errorResponse(400, "INVALID_JSON", error.message);
  }
  if (error instanceof z.ZodError) {
    return errorResponse(400, "VALIDATION_ERROR", "Datos inválidos", z.flattenError(error));
  }
  if (error instanceof DuplicateOrderNumberError) {
    return errorResponse(409, "DUPLICATE_ORDER_NUMBER", error.message);
  }
  if (error instanceof InvalidTransitionError) {
    return errorResponse(409, "INVALID_TRANSITION", error.message);
  }
  if (error instanceof StatusConflictError) {
    return errorResponse(409, "STATUS_CONFLICT", error.message, { currentStatus: error.currentStatus });
  }
  if (error instanceof NotFoundError) {
    return errorResponse(404, "NOT_FOUND", error.message);
  }
  console.error("Error interno de API", error);
  return errorResponse(500, "INTERNAL", "Ocurrió un error interno");
}
