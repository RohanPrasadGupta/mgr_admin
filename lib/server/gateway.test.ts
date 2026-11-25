// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory cookie jar standing in for next/headers.
const jar = vi.hoisted(() => new Map<string, { value: string; opts?: Record<string, unknown> }>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k)!.value } : undefined),
    set: (k: string, value: string, opts?: Record<string, unknown>) => { jar.set(k, { value, opts }); },
    delete: (k: string) => { jar.delete(k); },
  }),
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as mfa } from "@/app/api/auth/mfa/route";
import { GET as gatewayGet } from "@/app/api/admin/[...path]/route";
import { callApi } from "./upstream";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const post = (body: unknown, headers: Record<string, string> = {}) => new Request("http://admin.test/api/auth/x", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
let n = 0;

beforeEach(() => { jar.clear(); });

describe("admin sign-in routes", () => {
  it("keeps the 2FA token in an httpOnly cookie and hands the browser only the step", async () => {
    const f = vi.fn(async () => json(200, { data: { step: "setup", mfaToken: "mfa-token-123456789012345", secret: "ABCD", otpauthUrl: "otpauth://x" } }));
    vi.stubGlobal("fetch", f);
    const res = await login(post({ email: "a@b.co", password: "pw" }, { "x-forwarded-for": "6.6.6.6, 10.0.0.1" }));
    expect(await res.json()).toEqual({ data: { step: "setup", secret: "ABCD", otpauthUrl: "otpauth://x" } });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(jar.get("mma_mfa")).toMatchObject({ value: "mfa-token-123456789012345", opts: { httpOnly: true, sameSite: "strict", maxAge: 300 } });
    // the forwarded address is the one our proxy appended (rightmost), not the client-supplied one
    expect(f).toHaveBeenCalledWith("http://localhost:8000/v1/admin/auth/login", expect.objectContaining({ headers: expect.objectContaining({ "x-forwarded-for": "10.0.0.1" }) }));
  });

  it("the code step sends the cookie's token, sets the session and drops the 2FA cookie", async () => {
    jar.set("mma_mfa", { value: "mfa-token" });
    const f = vi.fn(async () => json(200, { data: { accessToken: "at", refreshToken: "rt", expiresIn: 600, admin: { id: "a", email: "a@b.co", name: "A", lastLoginAt: null } } }));
    vi.stubGlobal("fetch", f);
    const res = await mfa(post({ code: "123456" }));
    expect(await res.json()).toEqual({ data: { admin: { id: "a", email: "a@b.co", name: "A", lastLoginAt: null } } }); // no tokens in the body
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ mfaToken: "mfa-token", code: "123456" });
    expect(jar.get("mma_at")?.value).toBe("at");
    expect(jar.get("mma_rt")).toMatchObject({ value: "rt", opts: { maxAge: 12 * 3600, httpOnly: true } });
    expect(jar.has("mma_mfa")).toBe(false);
  });

  it("without a 2FA cookie the code step is refused before reaching the API", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = await mfa(post({ code: "123456" }));
    expect(res.status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("admin gateway", () => {
  it("refreshes an expired access token through the ADMIN refresh endpoint and retries once", async () => {
    const rt = `rt-${++n}`;
    jar.set("mma_at", { value: "stale" }); jar.set("mma_rt", { value: rt });
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/admin/auth/refresh")) return json(200, { data: { accessToken: "fresh", refreshToken: `${rt}-2`, expiresIn: 600 } });
      return (init?.headers as Record<string, string>).authorization === "Bearer stale" ? json(401, {}) : json(200, { ok: 1 });
    });
    vi.stubGlobal("fetch", f);
    const res = await callApi("/v1/admin/stats", { method: "GET" });
    expect(res.status).toBe(200);
    expect(f.mock.calls.map((c) => String(c[0]).replace("http://localhost:8000", ""))).toEqual(["/v1/admin/stats", "/v1/admin/auth/refresh", "/v1/admin/stats"]);
    expect(jar.get("mma_rt")?.value).toBe(`${rt}-2`);
  });

  it("a rejected refresh ends the session", async () => {
    jar.set("mma_rt", { value: `rt-${++n}` });
    vi.stubGlobal("fetch", vi.fn(async () => json(401, {})));
    const res = await callApi("/v1/admin/me", { method: "GET" });
    expect(res.status).toBe(401);
    expect(jar.size).toBe(0);
  });

  it("does not proxy the auth endpoints, and never lets responses be cached", async () => {
    jar.set("mma_at", { value: "good" });
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { data: { ok: 1 } })));
    const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) }) as never;
    const req = (p: string) => Object.assign(new Request(`http://admin.test/api/admin/${p}`), { nextUrl: new URL(`http://admin.test/api/admin/${p}`) }) as never;
    expect((await gatewayGet(req("auth/refresh"), ctx(["auth", "refresh"]))).status).toBe(404);
    const ok = await gatewayGet(req("stats"), ctx(["stats"]));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("private, no-store");
  });
});
