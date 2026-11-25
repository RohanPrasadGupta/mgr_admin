import "server-only";
import { API_URL, clearSession, readSession, setSession, type Tokens } from "./session";

/**
 * Admin refresh tokens rotate, so parallel requests that all find the access token expired share ONE refresh
 * call. Results are kept briefly so late arrivals still holding the old cookie get the new tokens.
 */
const inflight = new Map<string, { p: Promise<Tokens | null>; at: number }>();
function refreshOnce(refreshToken: string, headers: Record<string, string>): Promise<Tokens | null> {
  const now = Date.now();
  for (const [k, v] of inflight) if (now - v.at > 20_000) inflight.delete(k);
  const hit = inflight.get(refreshToken);
  if (hit) return hit.p;
  const p = fetch(`${API_URL}/v1/admin/auth/refresh`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ refreshToken }), cache: "no-store" })
    .then(async (r) => (r.ok ? ((await r.json()).data as Tokens) : null))
    .catch(() => null);
  inflight.set(refreshToken, { p, at: now });
  return p;
}

const unauthorized = (message: string) => new Response(JSON.stringify({ error: { code: "unauthorized", message } }), { status: 401, headers: { "content-type": "application/json" } });

/** Calls the API as the signed-in admin, refreshing the access token once when it has expired. */
export async function callApi(path: string, init: { method: string; body?: BodyInit | null; headers?: Record<string, string> }): Promise<Response> {
  const send = (token?: string) =>
    fetch(`${API_URL}${path}`, { ...init, headers: { ...init.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) }, cache: "no-store" });

  const { accessToken, refreshToken } = await readSession();
  const res = accessToken ? await send(accessToken) : null;
  if (res && res.status !== 401) return res;
  if (!refreshToken) { await clearSession(); return res ?? unauthorized("Not signed in"); }

  const fresh = await refreshOnce(refreshToken, init.headers ?? {});
  if (!fresh) { await clearSession(); return unauthorized("Admin session ended. Sign in again."); }
  await setSession(fresh);
  return send(fresh.accessToken);
}
