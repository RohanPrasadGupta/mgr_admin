"use client";
import { useHealth } from "@/lib/api/hooks";
import { dateTime } from "@/lib/format";
import { PageHeader } from "./admin-shell";
import { Badge, Button, Card, ErrorNote, PageSkeleton, cx } from "./ui";

function uptime(sec: number) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export function HealthView() {
  const { data, error, isPending, refetch, isFetching } = useHealth();
  if (isPending) return <PageSkeleton />;
  return (
    <div className="fade-in">
      <PageHeader
        title="System health"
        subtitle={data ? <>Checked {dateTime(data.checkedAt)} · refreshes every 30 seconds</> : undefined}
        actions={<Button variant="ghost" loading={isFetching} onClick={() => refetch()}>Check now</Button>}
      />
      {error ? <ErrorNote error={error} retry={() => refetch()} /> : (
        <div className="space-y-4">
          <Card className={cx("flex flex-wrap items-center justify-between gap-3", data.status === "ok" ? "border-income/50" : "border-warn/60")}>
            <div className="flex items-center gap-3">
              <span aria-hidden className={cx("size-3 rounded-full", data.status === "ok" ? "bg-income" : "bg-warn")} />
              <p className="font-semibold">{data.status === "ok" ? "All systems working" : "Something needs attention"}</p>
            </div>
            <p className="text-sm text-muted">API up {uptime(data.uptimeSec)} · Node {data.node}</p>
          </Card>
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {data.checks.map((c) => (
                <li key={c.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted">{c.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.latencyMs !== null && <span className="text-xs tabular-nums text-muted">{c.latencyMs} ms</span>}
                    <Badge tone={c.ok ? "ok" : "bad"}>{c.ok ? "OK" : "Failing"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
