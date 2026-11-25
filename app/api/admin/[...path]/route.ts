import type { NextRequest } from "next/server";
import { badGateway, clientHeaders, jsonError, relay } from "@/lib/server/http";
import { callApi } from "@/lib/server/upstream";

// Same-origin gateway to the API's /v1/admin/* routes. It attaches the admin bearer token from httpOnly
// cookies and refreshes it when needed; tokens never reach browser JS. Only admin routes are reachable here.
async function handle(req: NextRequest, ctx: RouteContext<"/api/admin/[...path]">) {
  const { path } = await ctx.params;
  if (path[0] === "auth") return jsonError(404, "not_found", "Use /api/auth/*");
  const body = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
  try {
    const up = await callApi(`/v1/admin/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`, {
      method: req.method,
      body: body || undefined,
      headers: { ...clientHeaders(req), ...(body ? { "content-type": "application/json" } : {}) },
    });
    return relay(up);
  } catch {
    return badGateway();
  }
}
export { handle as GET, handle as POST, handle as DELETE };
