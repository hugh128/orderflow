import { parseOrderFromText } from "@/lib/ai/parse-order";
import { checkAiRequestLimit } from "@/lib/ai/request-limit";
import { handleError } from "@/lib/api/errors";
import { readJson } from "@/lib/api/read-json";
import { parseOrderTextSchema } from "@/lib/schemas/parse-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { text } = parseOrderTextSchema.parse(await readJson(request));
    checkAiRequestLimit(request);
    return Response.json(await parseOrderFromText(text));
  } catch (error) {
    return handleError(error);
  }
}
