const dtf = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const df = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export const dateTime = (iso: string | null | undefined) => (iso ? dtf.format(new Date(iso)) : "—");
export const date = (iso: string | null | undefined) => (iso ? df.format(new Date(iso)) : "—");

/** "3 minutes ago" style, falling back to the date after a week. */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const units: [number, string][] = [[60, "minute"], [3600, "hour"], [86400, "day"]];
  for (let i = units.length - 1; i >= 0; i--) {
    const [n, name] = units[i];
    if (s >= n) { const v = Math.floor(s / n); return v >= 7 && name === "day" ? date(iso) : `${v} ${name}${v === 1 ? "" : "s"} ago`; }
  }
  return date(iso);
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
}

/** Human labels for audit actions; unknown ones show as stored. */
const ACTIONS: Record<string, string> = {
  "admin.login": "Signed in",
  "admin.login_failed": "Failed sign-in",
  "admin.2fa_enrolled": "Enrolled 2FA",
  "admin.mfa_failed": "Wrong 2FA code",
  "admin.created": "Admin created",
  "admin.2fa_reset": "Admin 2FA reset",
  "admin.disabled": "Admin disabled",
  "admin.enabled": "Admin enabled",
  "user.view": "Viewed user",
  "user.suspend": "Suspended user",
  "user.reactivate": "Reactivated user",
  "user.sign_out": "Signed user out",
  "user.resend_verification": "Resent verification",
  "user.mark_verified": "Marked verified",
  "user.delete": "Deleted user",
  "support.open": "Opened support view",
  "support.close": "Closed support view",
  "support.read": "Viewed user data",
};
export const actionLabel = (a: string) => ACTIONS[a] ?? a;
