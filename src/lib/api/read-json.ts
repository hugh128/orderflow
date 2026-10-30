export class InvalidJsonError extends Error {
  constructor() {
    super("El cuerpo debe ser un objeto JSON válido");
    this.name = "InvalidJsonError";
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InvalidJsonError();
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new InvalidJsonError();
  return body as Record<string, unknown>;
}
