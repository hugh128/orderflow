export class AiUnavailableError extends Error {
  constructor() {
    super("El asistente no está disponible; puedes crear el pedido manualmente");
    this.name = "AiUnavailableError";
  }
}
