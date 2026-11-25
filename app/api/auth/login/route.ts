import { badGateway, clientHeaders } from "@/lib/server/http";
import { API_URL, setMfaToken } from "@/lib/server/session";

// Step 1: password. The API answers with a short-lived 2FA token, which stays in an httpOnly cookie;
// the browser only learns which step comes next (and, on first sign-in, the secret to enrol).
export async function POST(req: Request) {
  let up: Response;
  try {
    up = await fetch(`${API_URL}/v1/admin/auth/login`, { method: "POST", headers: { ...clientHeaders(req), "content-type": "application/json" }, body: await req.text(), cache: "no-store" });
  } catch {
    return badGateway();
  }
  const json = await up.json().catch(() => null);
  if (!up.ok || !json?.data) return Response.json(json ?? { error: { code: "bad_gateway", message: "API unavailable" } }, { status: up.ok ? 502 : up.status, headers: { "cache-control": "private, no-store" } });
  const { mfaToken, ...step } = json.data as { mfaToken: string; step: "setup" | "mfa"; secret?: string; otpauthUrl?: string };
  await setMfaToken(mfaToken);
  return Response.json({ data: step }, { headers: { "cache-control": "private, no-store" } });
}
