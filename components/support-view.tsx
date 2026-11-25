"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { call, client } from "@/lib/api/client";
import { keys, SUPPORT_KINDS, useAdminMutation, useSupportData, type AdminUserDetail, type SupportKind } from "@/lib/api/hooks";
import { cellText, columnLabel, columnsFor } from "@/lib/support-table";
import { Button, Card, Empty, ErrorNote, Field, ListSkeleton, Modal, cx } from "./ui";

const LABELS: Record<SupportKind, string> = {
  accounts: "Accounts", transactions: "Transactions", categories: "Categories", budgets: "Budgets", recurring: "Recurring",
  goals: "Goals", debts: "Debts", notes: "Notes", investments: "Investments", attachments: "Receipts",
};

/** Minutes:seconds left; calls onExpire once when it reaches zero. */
function useCountdown(until: string | null, onExpire: () => void) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  const left = until ? Math.max(0, new Date(until).getTime() - now) : 0;
  useEffect(() => { if (until && left === 0) onExpire(); }, [until, left, onExpire]);
  return `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
}

function DataTable({ userId, kind, baseCurrency }: { userId: string; kind: SupportKind; baseCurrency: string }) {
  const { data, error, isPending, refetch } = useSupportData(userId, kind, true);
  if (isPending) return <ListSkeleton rows={4} />;
  if (error) return <ErrorNote error={error} retry={() => refetch()} />;
  if (data.items.length === 0) return <Empty>No {LABELS[kind].toLowerCase()}.</Empty>;
  const cols = columnsFor(data.items);
  return (
    <div>
      <div className="max-h-[28rem] overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card text-left text-xs text-muted">
            <tr>{cols.map((c) => <th key={c} className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">{columnLabel(c)}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map((row, i) => (
              <tr key={String(row.id ?? i)} className="border-b border-border last:border-0">
                {cols.map((c) => <td key={c} className={cx("max-w-[18rem] truncate px-3 py-1.5", c.endsWith("Minor") && "text-right tabular-nums")}>{cellText(row, c, baseCurrency)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{data.truncated ? `Showing the latest ${data.items.length}.` : `${data.items.length} shown.`} This view was recorded in the audit log.</p>
    </div>
  );
}

/**
 * The user's actual financial data. Closed by default: opening it needs a reason, lasts a limited time,
 * and every tab you load is written to the audit log (server-side; nothing here can skip that).
 */
export function SupportView({ detail }: { detail: AdminUserDetail }) {
  const id = detail.user.id;
  const qc = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState<SupportKind>("accounts");

  const open = useAdminMutation((r: string) => call(client.POST("/admin/users/{id}/support", { params: { path: { id } }, body: { reason: r } })), () => [keys.user(id), ["admin", "audit"]]);
  const close = useAdminMutation(() => call(client.DELETE("/admin/users/{id}/support", { params: { path: { id } } })), () => [keys.user(id), ["admin", "audit"]], "Support view closed");
  const expire = () => { qc.removeQueries({ queryKey: [...keys.user(id), "data"] }); qc.invalidateQueries({ queryKey: keys.user(id) }); };
  const left = useCountdown(detail.support.open ? detail.support.expiresAt : null, expire);

  // Drop any loaded data the moment the view closes, so nothing lingers in memory.
  useEffect(() => { if (!detail.support.open) qc.removeQueries({ queryKey: [...keys.user(id), "data"] }); }, [detail.support.open, id, qc]);

  if (!detail.support.open) {
    return (
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Support view</h2>
            <p className="mt-1 max-w-prose text-sm text-muted">Balances, transactions, notes and receipts stay hidden. To see them — for example to answer a support request — open a time-limited support view. You must give a reason, and every read is recorded in the audit log.</p>
          </div>
          <Button variant="ghost" onClick={() => setAsking(true)}>Open support view…</Button>
        </div>
        {asking && (
          <Modal open onClose={() => setAsking(false)} title="Open a support view">
            <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await open.mutateAsync(reason.trim()); setAsking(false); setReason(""); } catch { /* shown below */ } }}>
              <p className="text-sm text-muted">You&apos;ll see {detail.user.name}&apos;s financial data for a limited time. The reason is saved with every read.</p>
              <Field label="Reason (e.g. ticket number and what you're checking)">
                <textarea required minLength={3} maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]" />
              </Field>
              {open.error && <ErrorNote error={open.error} />}
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setAsking(false)}>Cancel</Button><Button type="submit" loading={open.isPending} disabled={reason.trim().length < 3}>Open support view</Button></div>
            </form>
          </Modal>
        )}
      </Card>
    );
  }

  return (
    <Card className="border-warn/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Support view <span className="ml-2 rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn">open · {left} left</span></h2>
          <p className="mt-1 text-sm text-muted">Every tab you open is recorded in the audit log.</p>
        </div>
        <Button variant="ghost" loading={close.isPending} onClick={() => close.mutate(undefined)}>Close support view</Button>
      </div>
      <div role="tablist" aria-label="User data" className="mt-4 flex gap-1 overflow-x-auto border-b border-border">
        {SUPPORT_KINDS.map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cx("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", tab === k ? "border-primary text-primary" : "border-transparent text-muted hover:text-fg")}>
            {LABELS[k]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-3"><DataTable key={tab} userId={id} kind={tab} baseCurrency={detail.user.baseCurrency} /></div>
    </Card>
  );
}
