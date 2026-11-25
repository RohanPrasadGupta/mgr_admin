import { badGateway, clientHeaders, jsonError } from "@/lib/server/http";
import { API_URL, clearMfaToken, setSession, takeMfaToken } from "@/lib/server/session";

// Step 2: the authenticator code. On success the session cookies are set and the 2FA token is dropped.
export async function POST(req: Request) {
  const mfaToken = await takeMfaToken();
  if (!mfaToken) return jsonError(401, "unauthorized", "Sign-in expired. Enter your password again.");
  const { code } = ((await req.json().catch(() => ({}))) ?? {}) as { code?: unknown };
  let up: Response;
  try {
    up = await fetch(`${API_URL}/v1/admin/auth/mfa`, { method: "POST", headers: { ...clientHeaders(req), "content-type": "application/json" }, body: JSON.stringify({ mfaToken, code }), cache: "no-store" });
  } catch {
    return badGateway();
  }
  const json = await up.json().catch(() => null);
  if (!up.ok || !json?.data) {
    if (up.status === 401) await clearMfaToken(); // the token itself is no longer usable: back to the password step
    return Response.json(json ?? { error: { code: "bad_gateway", message: "API unavailable" } }, { status: up.ok ? 502 : up.status, headers: { "cache-control": "private, no-store" } });
  }
  const { admin, ...tokens } = json.data;
  await setSession(tokens);
  await clearMfaToken();
  return Response.json({ data: { admin } }, { headers: { "cache-control": "private, no-store" } });
}
