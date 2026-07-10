import { requireAuth } from "@/app/lib/auth/middleware";
import { NextRequest } from "next/server";
import { handleComponentRoute } from "../../shared/component-handler";

export async function GET(request: NextRequest) {
  // Require admin authentication
  const { errorResponse } = await requireAuth(request, {
    requireAdmin: true,
  });
  if (errorResponse) return errorResponse;

  // Use env variable only — no user-controllable directory parameter
  const directory =
    process.env.DETRANS_COMPONENTS_DIR || "components/detrans";
  return handleComponentRoute(directory);
}
