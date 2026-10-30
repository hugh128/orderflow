import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getCloudflareClient } from "@/lib/ai/client";
import { AiUnavailableError } from "@/lib/ai/errors";

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "a".repeat(32));
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "dummy-test-token");
  vi.stubEnv("CLOUDFLARE_MODEL", "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
});
afterEach(() => vi.unstubAllEnvs());

it("CA-37: configura Cloudflare, timeout de 15 segundos y ningún reintento", () => {
  const client = getCloudflareClient();
  expect(client.baseURL).toBe(`https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/ai/v1`);
  expect(client.timeout).toBe(15000);
  expect(client.maxRetries).toBe(0);
});

it.each(["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_MODEL"])(
  "CA-38: sin %s falla con error seguro", (name) => {
    vi.stubEnv(name, " ");
    expect(getCloudflareClient).toThrow(AiUnavailableError);
  },
);

it("CA-37: un Account ID inválido no puede modificar el endpoint", () => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "../otra-ruta");
  expect(getCloudflareClient).toThrow(AiUnavailableError);
});
