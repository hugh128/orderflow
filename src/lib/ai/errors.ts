export class AiUnavailableError extends Error {
  constructor() {
    super("El asistente no está disponible; puedes crear el pedido manualmente");
    this.name = "AiUnavailableError";
  }
}

export class AiRateLimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super("Has alcanzado el límite de análisis; inténtalo de nuevo en un momento");
    this.name = "AiRateLimitError";
  }
}
