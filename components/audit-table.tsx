"use client";
import Link from "next/link";
import type { AuditEntry } from "@/lib/api/hooks";
import { actionLabel, dateTime } from "@/lib/format";
import { Badge } from "./ui";

const tone = (a: string) => (a.endsWith("_failed") || a === "user.delete" || a === "user.suspend" ? "bad" : a.startsWith("support.") ? "warn" : a.startsWith("admin.") ? "primary" : "muted");

/** One line of meta, e.g. "kind: transactions · rows: 12". */
const metaText = (m: AuditEntry["meta"]) => (m ? Object.entries(m).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ") : "");

export function AuditTable({ items, showTarget = true }: { items: AuditEntry[]; showTarget?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="border-b border-border text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">When</th><th className="px-4 py-2.5 font-medium">Admin</th><th className="px-4 py-2.5 font-medium">Action</th>
            {showTarget && <th className="px-4 py-2.5 font-medium">User</th>}
            <th className="px-4 py-2.5 font-medium">Reason / details</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} className="border-b border-border align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dateTime(e.createdAt)}</td>
              <td className="px-4 py-2.5">{e.adminEmail ?? <span className="text-muted">system</span>}{e.ip && <span className="block text-xs text-muted">{e.ip}</span>}</td>
              <td className="px-4 py-2.5"><Badge tone={tone(e.action)}>{actionLabel(e.action)}</Badge></td>
              {showTarget && (
                <td className="px-4 py-2.5">
                  {e.targetUserId ? <Link href={`/users/${e.targetUserId}`} className="hover:text-primary">{e.targetEmail ?? e.targetUserId}</Link> : e.targetEmail ?? <span className="text-muted">—</span>}
                </td>
              )}
              <td className="min-w-[16rem] px-4 py-2.5">
                {e.reason && <span className="block">{e.reason}</span>}
                {e.meta && <span className="block text-xs text-muted">{metaText(e.meta)}</span>}
                {!e.reason && !e.meta && <span className="text-muted">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
