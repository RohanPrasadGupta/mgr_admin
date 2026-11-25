"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAudit } from "@/lib/api/hooks";
import { actionLabel } from "@/lib/format";
import { PageHeader } from "./admin-shell";
import { AuditTable } from "./audit-table";
import { Card, Empty, ErrorNote, ListSkeleton, Pager, Select } from "./ui";

const ACTION_FILTERS = ["", "user.view", "user.suspend", "user.reactivate", "user.sign_out", "user.resend_verification", "user.mark_verified", "user.delete", "support.open", "support.read", "support.close", "admin.login", "admin.login_failed", "admin.mfa_failed", "admin.2fa_enrolled"];
const PAGE_SIZE = 50;

export function AuditView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const userId = params.get("userId") ?? undefined;
  const action = params.get("action") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const set = (k: string, v: string | number | undefined) => {
    const sp = new URLSearchParams(params.toString());
    if (v === undefined || v === "" || (k === "page" && v === 1)) sp.delete(k); else sp.set(k, String(v));
    if (k !== "page") sp.delete("page");
    const s = sp.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const { data, error, isPending, refetch } = useAudit({ userId, action, page, pageSize: PAGE_SIZE });

  return (
    <div className="fade-in">
      <PageHeader title="Audit log" subtitle="Every admin sign-in, action and support-view read. Entries can't be edited or removed." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by action" value={action} onChange={(e) => set("action", e.target.value)} className="max-w-xs">
          {ACTION_FILTERS.map((a) => <option key={a} value={a}>{a ? actionLabel(a) : "All actions"}</option>)}
        </Select>
        {userId && (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
            One user · <Link href={`/users/${userId}`} className="text-primary hover:underline">open</Link>
            <button type="button" aria-label="Show all users" onClick={() => set("userId", undefined)} className="text-muted hover:text-fg">✕</button>
          </span>
        )}
      </div>
      {isPending ? <ListSkeleton rows={8} /> : error ? <ErrorNote error={error} retry={() => refetch()} /> : data.items.length === 0 ? <Empty>No entries.</Empty> : (
        <Card className="overflow-hidden p-0">
          <AuditTable items={data.items} />
          <div className="border-t border-border px-4 py-3"><Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => set("page", p)} /></div>
        </Card>
      )}
    </div>
  );
}
