export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  }
  let body: unknown;
  try { body = await response.json(); } catch { /* Una respuesta HTML tampoco debe romper el manejo de errores. */ }
  if (!response.ok || body === undefined) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    if (error && typeof error.code === "string" && typeof error.message === "string") {
      throw new ApiError(response.status, error.code, error.message, isRecord(error.details) ? error.details : undefined);
    }
    throw new ApiError(response.status, "UNKNOWN_ERROR", "No se pudo completar la solicitud");
  }
  return body as T;
}
