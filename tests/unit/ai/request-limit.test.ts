import { afterEach, expect, it, vi } from "vitest";
import { checkAiRequestLimit } from "@/lib/ai/request-limit";
import { AiRateLimitError } from "@/lib/ai/errors";

afterEach(() => vi.useRealTimers());
it("CA-52: parser y resumen comparten diez solicitudes por IP en el mismo runtime", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(0);
  for (let i = 0; i < 10; i++) {
    checkAiRequestLimit(new Request(`http://localhost/api/orders/${i % 2 ? "parse" : "id/summary"}`, { headers: { "x-real-ip": "203.0.113.20" } }));
  }
  expect(() => checkAiRequestLimit(new Request("http://localhost/api/orders/id/summary", { headers: { "x-real-ip": "203.0.113.20" } }))).toThrow(AiRateLimitError);
  vi.setSystemTime(60_000);
  expect(() => checkAiRequestLimit(new Request("http://localhost/api/orders/parse", { headers: { "x-real-ip": "203.0.113.20" } }))).not.toThrow();
});
