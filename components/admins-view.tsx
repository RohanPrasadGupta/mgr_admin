"use client";
import { useState } from "react";
import { call, client } from "@/lib/api/client";
import { keys, useAdminMutation, useAdmins, useMe, type AdminAccount } from "@/lib/api/hooks";
import { ago, date } from "@/lib/format";
import { PageHeader } from "./admin-shell";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, ListSkeleton, Modal, Select } from "./ui";

type Action = "disable" | "enable" | "reset-2fa" | "reset-password" | "make-owner" | "make-admin";
const ACTIONS: Record<Action, { label: string; title: string; explain: string; success: string; danger?: boolean }> = {
  disable: { label: "Disable", title: "Disable this admin", explain: "They are signed out at once and can't sign in until enabled again.", success: "Admin disabled", danger: true },
  enable: { label: "Enable", title: "Enable this admin", explain: "They can sign in again with their current password and authenticator.", success: "Admin enabled" },
  "reset-2fa": { label: "Reset authenticator", title: "Reset their authenticator", explain: "Their current authenticator stops working and they are signed out. Their next sign-in shows a new QR code.", success: "Authenticator reset" },
  "reset-password": { label: "Reset password", title: "Give them a new one-time password", explain: "Their current password stops working and they are signed out. You get a one-time password to pass on; they must replace it when they sign in.", success: "New one-time password issued", danger: true },
  "make-owner": { label: "Make owner", title: "Make this admin an owner", explain: "Owners can also add, disable and reset admins — including you.", success: "Now an owner" },
  "make-admin": { label: "Make regular admin", title: "Remove owner rights", explain: "They keep the support tools but lose this Admins page.", success: "Now a regular admin" },
};

/** The one-time password is in the API response only: show it once, with a copy button and a clear warning. */
function OneTimePassword({ admin, password, onClose }: { admin: AdminAccount; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal open onClose={onClose} title="One-time password">
      <div className="space-y-3">
        <p className="text-sm">Give this to <b>{admin.name}</b> ({admin.email}) in person or through a private channel. They sign in with it, set up an authenticator app, and must then choose their own password.</p>
        <div className="flex items-center gap-2">
          <code data-testid="one-time-password" className="min-w-0 flex-1 select-all break-all rounded-lg border border-border bg-bg px-3 py-2 font-mono text-base">{password}</code>
          <Button type="button" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(password).catch(() => undefined); setCopied(true); }}>{copied ? "Copied" : "Copy"}</Button>
        </div>
        <p role="note" className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">It won&apos;t be shown again. If it&apos;s lost, use “Reset password” to make a new one.</p>
        <div className="flex justify-end"><Button type="button" onClick={onClose}>Done</Button></div>
      </div>
    </Modal>
  );
}

function AddAdmin({ onClose, onCreated }: { onClose: () => void; onCreated: (a: AdminAccount, pw: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "owner">("admin");
  const [reason, setReason] = useState("");
  const run = useAdminMutation(
    () => call(client.POST("/admin/admins", { body: { email: email.trim(), name: name.trim(), role, reason: reason.trim() } })),
    () => [keys.admins, ["admin", "audit"]],
    "Admin added",
  );
  return (
    <Modal open onClose={onClose} title="Add an admin">
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { const r = (await run.mutateAsync(undefined)).data; onCreated(r.admin, r.temporaryPassword); } catch { /* shown below */ } }}>
        <Field label="Email"><Input type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Name"><Input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Role" hint="Owners can also manage admins. Most people should be regular admins.">
          <Select value={role} onChange={(e) => setRole(e.target.value as "admin" | "owner")}><option value="admin">Regular admin — support tools</option><option value="owner">Owner — support tools + manage admins</option></Select>
        </Field>
        <Field label="Reason (saved in the audit log)">
          <textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]" />
        </Field>
        {run.error && <ErrorNote error={run.error} />}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={run.isPending} disabled={!email.trim() || !name.trim() || reason.trim().length < 3}>Add admin</Button></div>
      </form>
    </Modal>
  );
}

function ActionDialog({ admin, kind, onClose, onPassword }: { admin: AdminAccount; kind: Action; onClose: () => void; onPassword: (pw: string) => void }) {
  const a = ACTIONS[kind];
  const [reason, setReason] = useState("");
  const run = useAdminMutation(
    async (r: string): Promise<{ temporaryPassword?: string }> => {
      const params = { path: { id: admin.id } };
      switch (kind) {
        case "disable": await call(client.POST("/admin/admins/{id}/disable", { params, body: { reason: r } })); return {};
        case "enable": await call(client.POST("/admin/admins/{id}/enable", { params, body: { reason: r } })); return {};
        case "reset-2fa": await call(client.POST("/admin/admins/{id}/reset-2fa", { params, body: { reason: r } })); return {};
        case "reset-password": return (await call(client.POST("/admin/admins/{id}/reset-password", { params, body: { reason: r } }))).data;
        case "make-owner": await call(client.POST("/admin/admins/{id}/role", { params, body: { role: "owner", reason: r } })); return {};
        case "make-admin": await call(client.POST("/admin/admins/{id}/role", { params, body: { role: "admin", reason: r } })); return {};
      }
    },
    () => [keys.admins, ["admin", "audit"]],
    a.success,
  );
  return (
    <Modal open onClose={onClose} title={a.title}>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { const r = await run.mutateAsync(reason.trim()); if (r.temporaryPassword) onPassword(r.temporaryPassword); else onClose(); } catch { /* shown below */ } }}>
        <p className="text-sm text-muted">{a.explain}</p>
        <p className="text-sm"><span className="text-muted">Admin:</span> {admin.name} · {admin.email}</p>
        <Field label="Reason (saved in the audit log)">
          <textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]" />
        </Field>
        {run.error && <ErrorNote error={run.error} />}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant={a.danger ? "danger" : "primary"} loading={run.isPending} disabled={reason.trim().length < 3}>{a.label}</Button></div>
      </form>
    </Modal>
  );
}

function AdminBadges({ a }: { a: AdminAccount }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {a.role === "owner" ? <Badge tone="primary">Owner</Badge> : <Badge>Admin</Badge>}
      {a.disabledAt ? <Badge tone="bad">Disabled</Badge> : <Badge tone="ok">Active</Badge>}
      {!a.twoFactorEnabled && <Badge tone="warn">No authenticator yet</Badge>}
      {a.mustChangePassword && <Badge tone="warn">One-time password</Badge>}
    </span>
  );
}

export function AdminsView() {
  const { data: me } = useMe();
  const isOwner = me?.role === "owner";
  const admins = useAdmins(isOwner);
  const [adding, setAdding] = useState(false);
  const [acting, setActing] = useState<{ admin: AdminAccount; kind: Action } | null>(null);
  const [shown, setShown] = useState<{ admin: AdminAccount; password: string } | null>(null);

  if (me && !isOwner) return <><PageHeader title="Admins" /><Empty>Only owners can manage admin accounts.</Empty></>;
  const actionsFor = (a: AdminAccount): Action[] => [
    a.disabledAt ? "enable" : "disable", "reset-password", ...(a.twoFactorEnabled ? ["reset-2fa" as const] : []), a.role === "owner" ? "make-admin" : "make-owner",
  ];
  return (
    <div>
      <PageHeader title="Admins" subtitle="Who can use this console. New admins get a one-time password and must set up an authenticator." actions={<Button onClick={() => setAdding(true)}>Add admin</Button>} />
      {admins.error ? <ErrorNote error={admins.error} retry={() => void admins.refetch()} /> : !admins.data ? <ListSkeleton rows={3} /> : (
        <ul className="space-y-3">
          {admins.data.map((a) => (
            <li key={a.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{a.name}{a.id === me?.id && <span className="ml-2 text-xs text-muted">(you)</span>}</p>
                  <p className="truncate text-sm text-muted">{a.email}</p>
                  <AdminBadges a={a} />
                  <p className="text-xs text-muted">Last sign-in {ago(a.lastLoginAt)} · added {date(a.createdAt)}</p>
                </div>
                {a.id !== me?.id && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {actionsFor(a).map((k) => <Button key={k} variant={ACTIONS[k].danger ? "danger" : "ghost"} onClick={() => setActing({ admin: a, kind: k })}>{ACTIONS[k].label}</Button>)}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      {adding && <AddAdmin onClose={() => setAdding(false)} onCreated={(admin, password) => { setAdding(false); setShown({ admin, password }); }} />}
      {acting && <ActionDialog admin={acting.admin} kind={acting.kind} onClose={() => setActing(null)} onPassword={(password) => { setShown({ admin: acting.admin, password }); setActing(null); }} />}
      {shown && <OneTimePassword admin={shown.admin} password={shown.password} onClose={() => setShown(null)} />}
    </div>
  );
}
