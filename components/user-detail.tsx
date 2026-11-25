"use client";
import Link from "next/link";
import { useUser } from "@/lib/api/hooks";
import { ago, bytes, date, dateTime } from "@/lib/format";
import { AuditTable } from "./audit-table";
import { SupportView } from "./support-view";
import { Card, Empty, ErrorNote, PageSkeleton } from "./ui";
import { UserActions } from "./user-actions";
import { UserStatusBadges } from "./users-list";

const COUNT_LABELS: [keyof NonNullable<ReturnType<typeof useUser>["data"]>["counts"], string][] = [
  ["accounts", "Accounts"], ["transactions", "Transactions"], ["categories", "Categories"], ["tags", "Tags"], ["budgets", "Budgets"], ["recurring", "Recurring"],
  ["goals", "Goals"], ["debts", "Debts"], ["notes", "Notes"], ["assets", "Investments"], ["trades", "Trades"], ["attachments", "Receipts"],
];

/** Short device description from a user-agent string. */
function device(ua: string | null) {
  if (!ua) return "Unknown device";
  if (/okhttp|Expo|CFNetwork|Dalvik/i.test(ua)) return /Android|okhttp|Dalvik/i.test(ua) ? "Android app" : "iOS app";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? (/iPhone|iPad/.test(ua) ? "iOS" : "macOS") : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function UserDetail({ id }: { id: string }) {
  const { data, error, isPending, refetch } = useUser(id);
  if (isPending) return <PageSkeleton />;
  if (error) {
    const notFound = (error as { status?: number }).status === 404;
    return (
      <div className="space-y-3">
        <Link href="/users" className="text-sm text-muted hover:text-fg">← Users</Link>
        {notFound ? <Empty>This user doesn&apos;t exist (it may have been deleted).</Empty> : <ErrorNote error={error} retry={() => refetch()} />}
      </div>
    );
  }
  const u = data.user;
  return (
    <div className="fade-in space-y-4">
      <Link href="/users" className="text-sm text-muted hover:text-fg">← Users</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{u.name}</h1>
          <p className="truncate text-sm text-muted">{u.email}</p>
          <div className="mt-2"><UserStatusBadges u={u} /></div>
          {u.suspended && u.suspendedReason && <p className="mt-2 text-sm text-expense">Suspended: {u.suspendedReason}</p>}
        </div>
        <UserActions user={u} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {([["Joined", date(u.createdAt)], ["Last active", ago(u.lastActiveAt)], ["Base currency", u.baseCurrency], ["Time zone", u.timezone], ["Receipt storage", bytes(data.storageBytes)], ["User ID", u.id]] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="whitespace-nowrap text-muted">{k}</dt><dd className="truncate text-right" title={v}>{v}</dd></div>
            ))}
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="font-semibold">What they keep in MoneyMgr</h2>
          <p className="text-xs text-muted">Counts only. Amounts need a support view.</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {COUNT_LABELS.map(([k, label]) => <div key={k} className="flex justify-between gap-2"><dt className="text-muted">{label}</dt><dd className="tabular-nums">{data.counts[k].toLocaleString()}</dd></div>)}
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">Signed-in devices <span className="text-sm font-normal text-muted">({data.sessions.length})</span></h2>
        {data.sessions.length === 0 ? <p className="mt-2 text-sm text-muted">No active sessions.</p> : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {data.sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span title={s.userAgent ?? undefined}>{device(s.userAgent)}</span>
                <span className="text-muted">signed in {dateTime(s.createdAt)} · expires {date(s.expiresAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SupportView detail={data} />

      <Card className="p-0">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="font-semibold">Recent admin activity</h2>
          <Link href={`/audit?userId=${u.id}`} className="text-sm text-primary hover:underline">Full history</Link>
        </div>
        <div className="mt-2">{data.recentAudit.length === 0 ? <p className="px-4 pb-4 text-sm text-muted">Nothing yet.</p> : <AuditTable items={data.recentAudit} showTarget={false} />}</div>
      </Card>
    </div>
  );
}
