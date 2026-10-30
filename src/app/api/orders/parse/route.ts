import { parseOrderFromText } from "@/lib/ai/parse-order";
import { AiRateLimiter } from "@/lib/ai/rate-limit";
import { handleError } from "@/lib/api/errors";
import { readJson } from "@/lib/api/read-json";
import { parseOrderTextSchema } from "@/lib/schemas/parse-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const limiter = new AiRateLimiter();

export async function POST(request: Request) {
  try {
    const { text } = parseOrderTextSchema.parse(await readJson(request));
    // Vercel suministra estas cabeceras; otros proxies deben sanitizarlas.
    const ip = request.headers.get("x-real-ip")?.trim()
      || request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || "unknown";
    limiter.check(ip);
    return Response.json(await parseOrderFromText(text));
  } catch (error) {
    return handleError(error);
  }
}
