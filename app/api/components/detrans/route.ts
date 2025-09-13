import { NextRequest } from "next/server";
import { handleComponentRoute } from "../../shared/component-handler";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const directory =
    params.get("componentsDir") ||
    process.env.DETRANS_COMPONENTS_DIR ||
    "components/detrans";
  return handleComponentRoute(directory);
}
