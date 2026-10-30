import { handleError } from "@/lib/api/errors";
import type { IdContext } from "@/lib/api/transition-package";
import { getPackageHistory } from "@/lib/db/repo";
import { toPackageEventDTO } from "@/lib/dto";
import { parseId } from "@/lib/schemas/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, {params}: IdContext) {
  try { return Response.json((await getPackageHistory(parseId((await params).id))).map(toPackageEventDTO)); }
  catch(error) { return handleError(error); }
}
