import { clientHeaders } from "@/lib/server/http";
import { API_URL, clearSession, readSession } from "@/lib/server/session";

export async function POST(req: Request) {
  const { refreshToken } = await readSession();
  if (refreshToken) {
    await fetch(`${API_URL}/v1/admin/auth/logout`, { method: "POST", headers: { ...clientHeaders(req), "content-type": "application/json" }, body: JSON.stringify({ refreshToken }), cache: "no-store" }).catch(() => null);
  }
  await clearSession();
  return new Response(null, { status: 204 });
}
