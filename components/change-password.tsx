"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { call, client } from "@/lib/api/client";
import { keys } from "@/lib/api/hooks";
import { Wordmark } from "./brand";
import { Button, Card, ErrorNote, Field, Input } from "./ui";

/** Change the signed-in admin's password. With `required`, it replaces a one-time password and the rest of the site waits for it. */
export function ChangePasswordForm({ required, onDone }: { required?: boolean; onDone?: () => void }) {
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const mismatch = again.length > 0 && next !== again;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await call(client.POST("/admin/me/password", { body: { currentPassword: current, newPassword: next } }));
      await qc.invalidateQueries({ queryKey: keys.me });
      onDone?.();
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return (
    <form className="space-y-3" onSubmit={submit}>
      <Field label={required ? "One-time password" : "Current password"}><Input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus /></Field>
      <Field label="New password" hint="At least 12 characters. Don't reuse a password from another site."><Input type="password" autoComplete="new-password" required minLength={12} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      <Field label="New password again"><Input type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={mismatch} /></Field>
      {mismatch && <p className="text-sm text-expense">The two new passwords don&apos;t match.</p>}
      {error !== null && <ErrorNote error={error} />}
      <div className="flex justify-end"><Button type="submit" loading={busy} disabled={next.length < 12 || next !== again || !current}>{required ? "Set my password" : "Change password"}</Button></div>
    </form>
  );
}

/** Shown instead of the whole console until a one-time password has been replaced (the API refuses everything else meanwhile). */
export function RequiredPasswordChange({ name, onSignOut }: { name?: string; onSignOut: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <Wordmark height={24} />
        <div>
          <h1 className="text-xl font-semibold">Choose your own password</h1>
          <p className="mt-1 text-sm text-muted">{name ? `${name}, you` : "You"} signed in with a one-time password from an owner. Replace it with a password only you know before using the console.</p>
        </div>
        <ChangePasswordForm required />
        <button type="button" onClick={onSignOut} className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline">Sign out instead</button>
      </Card>
    </div>
  );
}
