import { AiRateLimiter } from "./rate-limit";

// Ambos endpoints comparten el presupuesto por IP dentro de cada instancia.
const limiter = new AiRateLimiter();
export function checkAiRequestLimit(request: Request) {
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
  limiter.check(ip);
}
