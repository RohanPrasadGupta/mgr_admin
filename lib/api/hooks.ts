"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { call, client } from "./client";
import type { components } from "./schema";

export type Schemas = components["schemas"];
export type AdminUserRow = Schemas["AdminUserRow"];
export type AdminUserDetail = Schemas["AdminUserDetail"];
// Free-form JSON objects come out of openapi-typescript as Record<string, never>; read them as unknown values.
export type AuditEntry = Omit<Schemas["AuditEntry"], "meta"> & { meta: Record<string, unknown> | null };
export type SupportRows = { kind: string; items: Record<string, unknown>[]; truncated: boolean };
export type UserStatus = "all" | "active" | "suspended" | "unverified";
export const SUPPORT_KINDS = ["accounts", "transactions", "categories", "budgets", "recurring", "goals", "debts", "notes", "investments", "attachments"] as const;
export type SupportKind = (typeof SUPPORT_KINDS)[number];

// Admin data is sensitive and changes under us (other admins, users themselves): short stale times, no persistence.
export const keys = {
  me: ["admin", "me"] as const,
  stats: ["admin", "stats"] as const,
  users: (q: object) => ["admin", "users", q] as const,
  user: (id: string) => ["admin", "user", id] as const,
  data: (id: string, kind: string) => ["admin", "user", id, "data", kind] as const,
  audit: (q: object) => ["admin", "audit", q] as const,
  health: ["admin", "health"] as const,
};

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: async () => (await call(client.GET("/admin/me"))).data, staleTime: 5 * 60_000 });
export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: async () => (await call(client.GET("/admin/stats"))).data, staleTime: 30_000 });
export const useHealth = () => useQuery({ queryKey: keys.health, queryFn: async () => (await call(client.GET("/admin/health"))).data, refetchInterval: 30_000 });

export function useUsers(q: { q?: string; status: UserStatus; page: number; pageSize?: number }) {
  return useQuery({
    queryKey: keys.users(q),
    queryFn: async () => (await call(client.GET("/admin/users", { params: { query: { ...q, q: q.q || undefined, pageSize: q.pageSize ?? 25 } } }))).data,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export const useUser = (id: string) =>
  useQuery({ queryKey: keys.user(id), queryFn: async () => (await call(client.GET("/admin/users/{id}", { params: { path: { id } } }))).data, staleTime: 10_000 });

export function useAudit(q: { userId?: string; action?: string; page: number; pageSize?: number }) {
  return useQuery({
    queryKey: keys.audit(q),
    queryFn: async () => (await call(client.GET("/admin/audit", { params: { query: { ...q, action: q.action || undefined, pageSize: q.pageSize ?? 50 } } }))).data,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/** Support data is only fetched while a support view is open, and every fetch is audited server-side: never refetch on our own. */
export const useSupportData = (id: string, kind: SupportKind, enabled: boolean) =>
  useQuery({
    queryKey: keys.data(id, kind),
    queryFn: async (): Promise<SupportRows> => (await call(client.GET("/admin/users/{id}/data/{kind}", { params: { path: { id, kind } } }))).data,
    enabled,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

/** A write followed by invalidation of what it changed. */
export function useAdminMutation<V, R>(fn: (v: V) => Promise<R>, invalidate: (v: V) => QueryKey[], success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    meta: success ? { success } : undefined,
    onSuccess: async (_r, v) => { await Promise.all(invalidate(v).map((queryKey) => qc.invalidateQueries({ queryKey }))); },
  });
}
