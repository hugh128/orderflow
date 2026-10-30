import { NotFoundError } from "../db/errors";
import { getOrder, transitionPackage } from "../db/repo";
import { toOrderDTO, toPackageDTO } from "../dto";
import { parseId } from "../schemas/id";
import { packageRejectionSchema, packageTransitionSchema } from "../schemas/package-transition";
import { handleError } from "./errors";
import { readJson } from "./read-json";

export type IdContext = { params: Promise<{ id: string }> };

export async function transitionPackageRequest(request: Request, { params }: IdContext, kind: "advance" | "reject") {
  try {
    const id = parseId((await params).id);
    const body = await readJson(request);
    const { expectedStatus } = packageTransitionSchema.parse(body);
    const reason = kind === "reject" ? packageRejectionSchema.parse(body).reason : undefined;
    const pkg = await transitionPackage(id, expectedStatus, kind, reason);
    const order = await getOrder(pkg.orderId);
    if (!order) throw new NotFoundError("El pedido no existe");
    return Response.json({ package: toPackageDTO(pkg), order: toOrderDTO(order) });
  } catch (error) {
    return handleError(error);
  }
}
