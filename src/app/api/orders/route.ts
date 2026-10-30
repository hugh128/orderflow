import { handleError } from "@/lib/api/errors";
import { readJson } from "@/lib/api/read-json";
import { createOrderWithPackages } from "@/lib/db/repo";
import { computeProgress } from "@/lib/domain/compute-progress";
import { toOrderDetailDTO } from "@/lib/dto";
import { createOrderSchema } from "@/lib/schemas/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = createOrderSchema.parse(await readJson(request));
    const { order, packages } = await createOrderWithPackages(input);
    return Response.json(toOrderDetailDTO({ ...order, packages, summary: computeProgress(packages) }), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
