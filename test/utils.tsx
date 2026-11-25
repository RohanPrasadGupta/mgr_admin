import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { makeQueryClient } from "@/app/providers";

export function renderWithClient(ui: ReactElement) {
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: 0 }, mutations: { retry: false } });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

type Handler = (req: { url: URL; body: any; method: string }) => unknown;
export interface Call { method: string; path: string; body: any; url: string }

/** Stubs global fetch with "METHOD /path" → JSON handlers (path without /api prefix or query). Unhandled calls fail loudly. */
export function mockFetch(routes: Record<string, Handler | unknown>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const isReq = typeof Request !== "undefined" && input instanceof Request;
    const url = new URL(isReq ? input.url : String(input), "http://localhost");
    const method = (isReq ? input.method : (init?.method ?? "GET")).toUpperCase();
    const text = isReq ? await input.clone().text() : init?.body ? String(init.body) : "";
    const path = url.pathname.replace(/^\/api/, "");
    const body = text ? JSON.parse(text) : undefined;
    calls.push({ method, path, body, url: url.pathname + url.search });
    const key = `${method} ${path}`;
    if (!(key in routes)) throw new Error(`Unhandled fetch: ${key}`);
    const h = routes[key];
    const out = await (typeof h === "function" ? (h as Handler)({ url, body, method }) : h);
    if (out instanceof Response) return out;
    if (out === null) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn, last: (method: string, path: string) => [...calls].reverse().find((c) => c.method === method && c.path === path) };
}

export const errorResponse = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), { status, headers: { "content-type": "application/json" } });

export const userRow = (over: Record<string, unknown> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111", email: "pat@example.com", name: "Pat", baseCurrency: "THB", timezone: "Asia/Bangkok",
  createdAt: "2026-11-01T00:00:00Z", emailVerified: false, suspended: false, suspendedReason: null, lastActiveAt: null, accountCount: 2, transactionCount: 10, ...over,
});

export const userDetail = (over: { user?: Record<string, unknown>; support?: { open: boolean; expiresAt: string | null } } = {}) => ({
  user: userRow(over.user),
  counts: { accounts: 2, transactions: 10, categories: 5, tags: 0, budgets: 1, recurring: 0, goals: 0, debts: 0, notes: 1, assets: 0, trades: 0, attachments: 0 },
  storageBytes: 0, sessions: [], recentAudit: [],
  support: over.support ?? { open: false, expiresAt: null },
});
