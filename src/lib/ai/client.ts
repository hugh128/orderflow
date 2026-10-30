import OpenAI from "openai";
import { AiUnavailableError } from "./errors";

// Se crea bajo demanda: importar el módulo no exige secretos durante el build.
export function getCloudflareClient(): OpenAI {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const model = process.env.CLOUDFLARE_MODEL?.trim();
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !token || !model) {
    throw new AiUnavailableError();
  }
  return new OpenAI({
    apiKey: token,
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
    timeout: 15_000,
    maxRetries: 0,
  });
}
