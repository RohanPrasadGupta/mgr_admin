"use client";
import Link from "next/link";
import { useState } from "react";
import { useStats } from "@/lib/api/hooks";
import { bytes, dateTime } from "@/lib/format";
import { PageHeader } from "./admin-shell";
import { Card, ErrorNote, PageSkeleton } from "./ui";

function Kpi({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const body = (
    <Card className="h-full transition hover:border-primary/50">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
  return href ? <Link href={href} className="block rounded-2xl">{body}</Link> : body;
}

/** Daily sign-ups as bars. Hover (or focus) a bar to read its day. */
export function SignupChart({ data }: { data: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 600, H = 160, gap = 3, bw = data.length ? (W - gap * (data.length - 1)) / data.length : 0;
  const total = data.reduce((s, d) => s + d.count, 0);
  const shown = hover !== null ? data[hover] : null;
  return (
    <div>
      <p className="mb-2 h-5 text-sm text-muted" aria-live="polite">
        {shown ? <><span className="font-medium text-fg">{shown.count}</span> on {shown.date}</> : <><span className="font-medium text-fg">{total}</span> in the last {data.length} days</>}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label={`Sign-ups per day: ${total} over ${data.length} days, most in one day ${max}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = d.count === 0 ? 2 : Math.max(4, (d.count / max) * (H - 8));
          return (
            <rect key={d.date} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={2}
              fill={d.count === 0 ? "var(--border)" : "var(--primary)"} opacity={hover === null || hover === i ? 1 : 0.45}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <title>{`${d.date}: ${d.count}`}</title>
            </rect>
          );
        })}
      </svg>
      {data.length > 0 && <div className="mt-1 flex justify-between text-xs text-muted"><span>{data[0].date}</span><span>{data[data.length - 1].date}</span></div>}
    </div>
  );
}

export function Overview() {
  const { data, error, refetch, isPending } = useStats();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorNote error={error} retry={() => refetch()} />;
  const u = data.users, t = data.totals;
  return (
    <div className="fade-in">
      <PageHeader title="Overview" subtitle={<>Usage across all users. Counts only — no balances or amounts. Updated {dateTime(data.generatedAt)}.</>} />
      <section aria-label="Users" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Users" value={u.total} hint={`${u.verified.toLocaleString()} verified`} href="/users" />
        <Kpi label="New in 7 days" value={u.newLast7} hint={`${u.newLast30.toLocaleString()} in 30 days`} />
        <Kpi label="Active in 30 days" value={u.activeLast30} hint={u.total ? `${Math.round((u.activeLast30 / u.total) * 100)}% of users` : undefined} />
        <Kpi label="Suspended" value={u.suspended} hint={`${u.unverified.toLocaleString()} unverified`} href="/users?status=suspended" />
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="font-semibold">Sign-ups</h2>
          <div className="mt-2"><SignupChart data={data.signupsByDay} /></div>
        </Card>
        <Card>
          <h2 className="font-semibold">Stored records</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {([["Accounts", t.accounts], ["Transactions", t.transactions], ["Budgets", t.budgets], ["Goals", t.goals], ["Debts", t.debts], ["Notes", t.notes], ["Investments", t.assets], ["Trades", t.trades], ["Receipts", t.attachments]] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{v.toLocaleString()}</dd></div>
            ))}
            <div className="col-span-2 flex justify-between gap-2"><dt className="text-muted">Receipt storage</dt><dd className="tabular-nums">{bytes(t.attachmentBytes)}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
