import { checkAiRequestLimit } from "@/lib/ai/request-limit";
import { summarizeOrderHistory } from "@/lib/ai/summarize-history";
import { handleError } from "@/lib/api/errors";
import type { IdContext } from "@/lib/api/transition-package";
import { NotFoundError } from "@/lib/db/errors";
import { getOrderHistorySnapshot } from "@/lib/db/repo";
import { toOrderDTO, toPackageEventDTO } from "@/lib/dto";
import { parseId } from "@/lib/schemas/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: Request, { params }: IdContext) {
  try {
    const snapshot = await getOrderHistorySnapshot(parseId((await params).id));
    if (!snapshot) throw new NotFoundError("El pedido no existe");
    checkAiRequestLimit(request);
    return Response.json(
      await summarizeOrderHistory({
        order: toOrderDTO(snapshot.order),
        observedAt: snapshot.observedAt,
        events: snapshot.events.map(({ event, sequence }) => ({
          ...toPackageEventDTO(event),
          sequence,
        })),
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}
