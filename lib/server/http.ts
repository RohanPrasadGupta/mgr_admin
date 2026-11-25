import "server-only";

const NO_STORE = { "cache-control": "private, no-store" };

export const badGateway = () =>
  Response.json({ error: { code: "bad_gateway", message: "The API is unavailable. Please try again." } }, { status: 502, headers: NO_STORE });

export const jsonError = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status, headers: NO_STORE });

/**
 * The API rate-limits and audits admin actions by client IP. Pass the browser's address along, taking the
 * RIGHTMOST X-Forwarded-For entry (the one our own proxy appended; entries to its left can be forged).
 */
export function clientHeaders(req: Request): Record<string, string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean).at(-1) || req.headers.get("x-real-ip")?.trim();
  return { "user-agent": req.headers.get("user-agent") ?? "moneymgr-admin", ...(ip ? { "x-forwarded-for": ip } : {}) };
}

/** Passes an API response through unchanged apart from never letting anything cache it. */
export async function relay(up: Response): Promise<Response> {
  if (up.status === 204) return new Response(null, { status: 204, headers: NO_STORE });
  return new Response(await up.text(), { status: up.status, headers: { "content-type": up.headers.get("content-type") ?? "application/json", ...NO_STORE } });
}
