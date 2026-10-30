import { transitionPackageRequest, type IdContext } from "@/lib/api/transition-package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: IdContext) {
  return transitionPackageRequest(request, context, "reject");
}
