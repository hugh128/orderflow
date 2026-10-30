import { describe, expect, it } from "vitest";
import { AiRateLimiter } from "@/lib/ai/rate-limit";
import { AiRateLimitError } from "@/lib/ai/errors";

describe("T22: límite de ventana deslizante", () => {
  it("CA-40: permite diez solicitudes y bloquea la undécima sin afectar otra clave", () => {
    const limiter = new AiRateLimiter(() => 0);
    for (let i = 0; i < 10; i++) limiter.check("ip-1");
    expect(() => limiter.check("ip-1")).toThrow(AiRateLimitError);
    expect(() => limiter.check("ip-2")).not.toThrow();
  });

  it("CA-40: Retry-After redondea hacia arriba y rechazos no prolongan la ventana", () => {
    let time = 0;
    const limiter = new AiRateLimiter(() => time);
    for (let i = 0; i < 10; i++) limiter.check("ip");
    time = 58_501;
    expect(() => limiter.check("ip")).toThrow(expect.objectContaining({ retryAfter: 2 }));
    time = 60_000;
    expect(() => limiter.check("ip")).not.toThrow();
  });

  it("CA-40: solo libera solicitudes que realmente salieron de la ventana", () => {
    let time = 0;
    const limiter = new AiRateLimiter(() => time);
    for (let i = 0; i < 9; i++) limiter.check("ip");
    time = 30_000;
    limiter.check("ip");
    time = 60_000;
    for (let i = 0; i < 9; i++) limiter.check("ip");
    expect(() => limiter.check("ip")).toThrow(expect.objectContaining({ retryAfter: 30 }));
    time = 90_000;
    expect(() => limiter.check("ip")).not.toThrow();
  });

  it("CA-40: limpia claves antiguas aunque la siguiente solicitud use otra IP", () => {
    let time = 0;
    const limiter = new AiRateLimiter(() => time);
    for (let i = 0; i < 100; i++) limiter.check(`ip-${i}`);
    expect(limiter.size).toBe(100);
    time = 60_000;
    limiter.check("ip-nueva");
    expect(limiter.size).toBe(1);
  });
});
