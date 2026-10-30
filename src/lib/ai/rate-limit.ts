import { AiRateLimitError } from "./errors";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

// Mejor esfuerzo: cada instancia serverless conserva su propio contador.
export class AiRateLimiter {
  private readonly requests = new Map<string, number[]>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  get size(): number {
    return this.requests.size;
  }

  check(key: string): void {
    const now = this.now();
    const cutoff = now - WINDOW_MS;
    // Limpiar también las IP que dejaron de llamar. No hay temporizadores activos.
    for (const [ip, timestamps] of this.requests) {
      if (timestamps[timestamps.length - 1] <= cutoff) this.requests.delete(ip);
    }
    const timestamps = (this.requests.get(key) ?? []).filter((time) => time > cutoff);
    if (timestamps.length >= MAX_REQUESTS) {
      throw new AiRateLimitError(Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000));
    }
    timestamps.push(now);
    this.requests.set(key, timestamps);
  }
}
