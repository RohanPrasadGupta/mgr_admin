"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { authPost } from "@/lib/api/client";
import { useMe } from "@/lib/api/hooks";
import { Wordmark } from "./brand";
import { ChangePasswordForm, RequiredPasswordChange } from "./change-password";
import { Modal, cx } from "./ui";
import { toast } from "@/lib/toast";

const NAV = [
  { href: "/", label: "Overview", icon: "▦" },
  { href: "/users", label: "Users", icon: "◉" },
  { href: "/audit", label: "Audit log", icon: "☰" },
  { href: "/health", label: "System health", icon: "♥" },
  { href: "/admins", label: "Admins", icon: "⚿", ownerOnly: true },
] as const;

const active = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("mma_theme", next); } catch { /* private mode */ }
  };
  return <button type="button" onClick={toggle} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-border/50 hover:text-fg" aria-label="Switch light or dark theme">◐</button>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { data: me } = useMe();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await authPost("logout").catch(() => undefined);
    window.location.replace("/login");
  }

  if (me?.mustChangePassword) return <RequiredPasswordChange name={me.name} onSignOut={signOut} />;
  const nav = NAV.filter((n) => !("ownerOnly" in n) || me?.role === "owner");

  return (
    <div className="min-h-screen">
      <div className="admin-strip" />
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 lg:hidden">
        <Wordmark height={22} />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-nav" className="rounded-lg border border-border px-3 py-1.5 text-sm">Menu</button>
      </header>
      <div className="lg:flex">
        <aside id="admin-nav" className={cx("border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-r", open ? "block border-b" : "hidden")}>
          <div className="hidden items-center gap-2 px-5 pb-1 pt-5 lg:flex"><Wordmark height={24} priority /></div>
          <p className="hidden px-5 text-xs font-semibold uppercase tracking-wider text-warn lg:block">Admin console</p>
          <nav aria-label="Admin" className="space-y-0.5 p-3 lg:mt-3">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active(path, n.href) ? "page" : undefined}
                className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition", active(path, n.href) ? "bg-primary/12 text-primary" : "text-muted hover:bg-border/40 hover:text-fg")}>
                <span aria-hidden className="w-4 text-center">{n.icon}</span>{n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-2 border-t border-border p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{me?.name ?? "…"}</p>
              <p className="truncate text-xs text-muted">{me?.email}{me?.role === "owner" && " · owner"}</p>
            </div>
            <button type="button" onClick={() => setPwOpen(true)} className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline">Change password</button>
            <div className="flex items-center justify-between">
              <button type="button" onClick={signOut} disabled={signingOut} className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline">{signingOut ? "Signing out…" : "Sign out"}</button>
              <ThemeToggle />
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change your password"><ChangePasswordForm onDone={() => { setPwOpen(false); toast.success("Password changed"); }} /></Modal>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      {actions}
    </div>
  );
}
