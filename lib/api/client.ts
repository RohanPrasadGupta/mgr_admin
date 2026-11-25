import createClient from "openapi-fetch";
import type { paths } from "./schema";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

/** Same-origin fetch through the Next.js gateway. A 401 means the admin session is over: back to sign-in. */
async function gatewayFetch(input: Request): Promise<Response> {
  const res = await fetch(input, { cache: "no-store" });
  if (res.status === 401 && typeof window !== "undefined") window.location.replace("/login");
  return res;
}

/**
 * Typed client generated from the API's OpenAPI document (lib/api/schema.d.ts — `npm run api:sync`).
 * Paths are the API's own (`/admin/...`); the gateway at /api maps them onto /v1.
 */
export const client = createClient<paths>({
  baseUrl: `${typeof window !== "undefined" ? window.location.origin : "http://localhost"}/api`,
  fetch: gatewayFetch as unknown as typeof fetch,
});

type Result<T> = { data?: T; error?: unknown; response: Response };

const networkError = () => {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return new ApiError(0, "network_error", offline ? "You're offline. Check your connection and try again." : "Can't reach the server. Please try again in a moment.");
};

/** Unwraps a client result: returns the body, or throws an ApiError carrying the API's code/message. */
export async function call<T>(result: Promise<Result<T>>): Promise<T> {
  let r: Result<T>;
  try { r = await result; } catch { throw networkError(); }
  const { data, error, response } = r;
  if (error !== undefined || !response.ok) {
    const e = (error as { error?: { code?: string; message?: string; details?: unknown } } | undefined)?.error;
    throw new ApiError(response.status, e?.code ?? "error", e?.message ?? `Request failed (${response.status})`, e?.details);
  }
  return data as T;
}

export type LoginStep = { step: "setup" | "mfa"; secret?: string; otpauthUrl?: string };

/** Sign-in goes to the gateway's own /api/auth routes, which keep every token in httpOnly cookies. */
export async function authPost<T>(action: "login" | "mfa" | "logout", body?: unknown): Promise<T | undefined> {
  let res: Response;
  try {
    res = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw networkError(); }
  if (res.status === 204) return undefined;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? "error", json?.error?.message ?? "Request failed", json?.error?.details);
  return json?.data as T;
}
