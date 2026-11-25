"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { call, client } from "@/lib/api/client";
import { keys, useAdminMutation, type AdminUserRow } from "@/lib/api/hooks";
import { Button, ErrorNote, Field, Input, Modal } from "./ui";

type ActionKind = "suspend" | "reactivate" | "sign-out" | "resend-verification" | "mark-verified";

const ACTIONS: Record<ActionKind, { label: string; title: string; explain: string; success: string; variant: "primary" | "ghost" | "danger" }> = {
  suspend: { label: "Suspend", title: "Suspend this user", explain: "They are signed out everywhere at once and can't sign in until reactivated. Their data is kept.", success: "User suspended", variant: "danger" },
  reactivate: { label: "Reactivate", title: "Reactivate this user", explain: "They can sign in again.", success: "User reactivated", variant: "primary" },
  "sign-out": { label: "Force sign-out", title: "Sign this user out everywhere", explain: "Ends every session on every device. They can sign in again straight away.", success: "Sessions ended", variant: "ghost" },
  "resend-verification": { label: "Resend verification", title: "Resend the verification email", explain: "Sends a new confirmation link to their email address.", success: "Verification email sent", variant: "ghost" },
  "mark-verified": { label: "Mark verified", title: "Mark the email as confirmed", explain: "Use only when you have confirmed the address some other way.", success: "Email marked as confirmed", variant: "ghost" },
};

/** Every action asks for a reason; it is stored with the action in the audit log. */
function ReasonDialog({ user, kind, onClose }: { user: AdminUserRow; kind: ActionKind; onClose: () => void }) {
  const a = ACTIONS[kind];
  const [reason, setReason] = useState("");
  const run = useAdminMutation(
    (r: string): Promise<unknown> => {
      const opts = { params: { path: { id: user.id } }, body: { reason: r } };
      switch (kind) {
        case "suspend": return call(client.POST("/admin/users/{id}/suspend", opts));
        case "reactivate": return call(client.POST("/admin/users/{id}/reactivate", opts));
        case "sign-out": return call(client.POST("/admin/users/{id}/sign-out", opts));
        case "resend-verification": return call(client.POST("/admin/users/{id}/resend-verification", opts));
        case "mark-verified": return call(client.POST("/admin/users/{id}/mark-verified", opts));
      }
    },
    () => [keys.user(user.id), ["admin", "users"], ["admin", "audit"], keys.stats],
    a.success,
  );
  return (
    <Modal open onClose={onClose} title={a.title}>
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await run.mutateAsync(reason.trim()); onClose(); } catch { /* shown below */ } }}>
        <p className="text-sm text-muted">{a.explain}</p>
        <p className="text-sm"><span className="text-muted">User:</span> {user.name} · {user.email}</p>
        <Field label="Reason (saved in the audit log)">
          <textarea required minLength={3} maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]" />
        </Field>
        {run.error && <ErrorNote error={run.error} />}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant={a.variant === "danger" ? "danger" : "primary"} loading={run.isPending} disabled={reason.trim().length < 3}>{a.label}</Button></div>
      </form>
    </Modal>
  );
}

/** Deleting is permanent: needs a reason AND the user's email typed out. */
function DeleteDialog({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const run = useAdminMutation(
    () => call(client.DELETE("/admin/users/{id}", { params: { path: { id: user.id } }, body: { reason: reason.trim(), confirmEmail: confirm.trim().toLowerCase() } })),
    () => [["admin", "users"], ["admin", "audit"], keys.stats],
    "User and all their data deleted",
  );
  const matches = confirm.trim().toLowerCase() === user.email.toLowerCase();
  return (
    <Modal open onClose={onClose} title="Delete this user permanently">
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await run.mutateAsync(undefined); onClose(); router.replace("/users"); } catch { /* shown below */ } }}>
        <p role="note" className="rounded-lg border border-expense/40 bg-expense/10 p-3 text-sm text-expense">
          This deletes the account, every transaction, budget, goal, note, investment and receipt. It cannot be undone. The audit log keeps a record that it happened.
        </p>
        <Field label="Reason (saved in the audit log)">
          <textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]" />
        </Field>
        <Field label={`Type ${user.email} to confirm`}><Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} /></Field>
        {run.error && <ErrorNote error={run.error} />}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="danger" loading={run.isPending} disabled={!matches || reason.trim().length < 3}>Delete permanently</Button></div>
      </form>
    </Modal>
  );
}

export function UserActions({ user }: { user: AdminUserRow }) {
  const [open, setOpen] = useState<ActionKind | "delete" | null>(null);
  const available: ActionKind[] = [
    user.suspended ? "reactivate" : "suspend",
    "sign-out",
    ...(!user.emailVerified ? (["resend-verification", "mark-verified"] as const) : []),
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {available.map((k) => <Button key={k} variant={ACTIONS[k].variant} onClick={() => setOpen(k)}>{ACTIONS[k].label}</Button>)}
      <Button variant="ghost" className="text-expense" onClick={() => setOpen("delete")}>Delete…</Button>
      {open === "delete" ? <DeleteDialog user={user} onClose={() => setOpen(null)} /> : open && <ReasonDialog user={user} kind={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
