import { handleError } from "@/lib/api/errors";
import { NotFoundError } from "@/lib/db/errors";
import { getOrder } from "@/lib/db/repo";
import { toOrderDetailDTO } from "@/lib/dto";
import { parseId } from "@/lib/schemas/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId((await params).id);
    const order = await getOrder(id);
    if (!order) throw new NotFoundError("El pedido no existe");
    return Response.json(toOrderDetailDTO(order));
  } catch (error) {
    return handleError(error);
  }
}
