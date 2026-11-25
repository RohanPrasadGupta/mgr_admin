"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useUsers, type AdminUserRow, type UserStatus } from "@/lib/api/hooks";
import { ago, date } from "@/lib/format";
import { PageHeader } from "./admin-shell";
import { Badge, Card, Empty, ErrorNote, Input, ListSkeleton, Pager, Segmented } from "./ui";

const STATUSES: { value: UserStatus; label: string }[] = [
  { value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }, { value: "unverified", label: "Unverified" },
];
const PAGE_SIZE = 25;

export function UserStatusBadges({ u }: { u: Pick<AdminUserRow, "suspended" | "emailVerified"> }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {u.suspended ? <Badge tone="bad">Suspended</Badge> : <Badge tone="ok">Active</Badge>}
      {!u.emailVerified && <Badge tone="warn">Unverified</Badge>}
    </span>
  );
}

export function UsersList() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = (STATUSES.some((s) => s.value === params.get("status")) ? params.get("status") : "all") as UserStatus;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);

  // The URL is the state (shareable, survives reload); typing updates it after a short pause.
  const setParams = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) { if (v === undefined || v === "" || (k === "status" && v === "all") || (k === "page" && v === 1)) sp.delete(k); else sp.set(k, String(v)); }
    const s = sp.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  useEffect(() => {
    if (search.trim() === q) return;
    const t = setTimeout(() => setParams({ q: search.trim(), page: 1 }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text drives this
  }, [search]);

  const { data, error, refetch, isPending, isFetching } = useUsers({ q, status, page, pageSize: PAGE_SIZE });

  return (
    <div className="fade-in">
      <PageHeader title="Users" subtitle={data ? `${data.total.toLocaleString()} ${data.total === 1 ? "user" : "users"}${q || status !== "all" ? " match" : ""}` : " "} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="search" placeholder="Search by email or name" aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Segmented value={status} onChange={(v) => setParams({ status: v, page: 1 })} options={STATUSES} />
        {isFetching && !isPending && <span className="text-xs text-muted">Updating…</span>}
      </div>
      {isPending ? <ListSkeleton rows={8} /> : error ? <ErrorNote error={error} retry={() => refetch()} /> : data.items.length === 0 ? (
        <Empty>No users match.</Empty>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted">
                <tr><th className="px-4 py-2.5 font-medium">User</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Joined</th><th className="px-4 py-2.5 font-medium">Last active</th><th className="px-4 py-2.5 text-right font-medium">Accounts</th><th className="px-4 py-2.5 text-right font-medium">Transactions</th></tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-border/25">
                    <td className="px-4 py-2.5">
                      <Link href={`/users/${u.id}`} className="block font-medium hover:text-primary">{u.name}</Link>
                      <span className="text-xs text-muted">{u.email}</span>
                    </td>
                    <td className="px-4 py-2.5"><UserStatusBadges u={u} /></td>
                    <td className="px-4 py-2.5 text-muted">{date(u.createdAt)}</td>
                    <td className="px-4 py-2.5 text-muted">{ago(u.lastActiveAt)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{u.accountCount}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{u.transactionCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3"><Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setParams({ page: p })} /></div>
        </Card>
      )}
    </div>
  );
}
