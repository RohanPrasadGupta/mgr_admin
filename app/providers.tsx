"use client";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/toaster";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";

/** Retry only what can succeed on a second try: network failures and 5xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) return (error.status === 0 || error.status >= 500) && failureCount < 2;
  return failureCount < 1;
}

export function makeQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_d, _v, _c, m) => { const msg = m.meta?.success; if (typeof msg === "string") toast.success(msg); },
      onError: (e, _v, _c, m) => { if (!m.meta?.silent) toast.error(e instanceof Error ? e.message : "Something went wrong"); },
    }),
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}<Toaster /></QueryClientProvider>;
}
